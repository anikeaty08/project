from __future__ import annotations

import uuid
from concurrent.futures import ThreadPoolExecutor
from typing import Any, TypedDict

from sqlalchemy.orm import Session

from app.config import settings
from app.memory import get_memory_store
from app.models.chat import ChatMessage, ChatSession
from app.models.session_upload import SessionUpload
from app.services.answer_service import AnswerService
from app.services.auth import AuthUser, verify_session_user
from app.services.chat_models import RetrievalPlan, UploadContext, agent_step
from app.services.chat_planner import ChatPlanner
from app.services.chat_repository import ChatRepository
from app.services.chat_verification import ChatVerificationService
from app.services.history_utils import messages_to_dicts, trim_messages_for_llm
from app.services.observability import traced_stage
from app.services.retrieval_service import RetrievalService
from app.services.upload_context import UploadContextService

try:
    from langgraph.graph import END, StateGraph
except Exception:  # pragma: no cover - keeps local dev alive before pip install.
    END = "__end__"
    StateGraph = None  # type: ignore[assignment]


COMPLEX_MARKERS = {
    "compare",
    "comparison",
    "research",
    "investigate",
    "interaction",
    "interactions",
    "side effect",
    "side effects",
    "dosage",
    "dose",
    "safe",
    "safety",
    "precaution",
    "precautions",
    "contraindication",
    "contraindications",
    "versus",
    " vs ",
    "and also",
}


class ChatGraphState(TypedDict, total=False):
    db: Session
    session_id: uuid.UUID
    user_content: str
    language: str | None
    upload_ids: list[uuid.UUID] | None
    auth_user: AuthUser | None
    trace_id: str
    session: ChatSession
    uploads: list[SessionUpload]
    memory: Any
    session_summary: str | None
    user_row: ChatMessage
    assistant_row: ChatMessage
    trimmed_messages: list[dict[str, Any]]
    plan: RetrievalPlan
    upload_ctx: UploadContext
    supplement_parts: list[str]
    supplement: str | None
    context: str
    sources: list[dict[str, Any]]
    answer: str
    needs_verification: bool
    use_autonomous_loop: bool
    tool_steps: int
    steps: list[dict[str, str]]


class ChatAgentGraph:
    def __init__(self) -> None:
        self.repo = ChatRepository()
        self.planner = ChatPlanner()
        self.upload_context = UploadContextService()
        self.retrieval = RetrievalService()
        self.verification = ChatVerificationService()
        self.answerer = AnswerService()
        self.graph = self._compile_graph()

    def invoke(self, initial_state: ChatGraphState) -> ChatGraphState:
        if self.graph is None:
            return self._invoke_without_langgraph(initial_state)
        return self.graph.invoke(initial_state)

    def _compile_graph(self):
        if StateGraph is None:
            return None
        graph = StateGraph(ChatGraphState)
        graph.add_node("validate_session", self._validate_session)
        graph.add_node("save_user_message", self._save_user_message)
        graph.add_node("plan_context", self._plan_context)
        graph.add_node("fast_tools", self._fast_tools)
        graph.add_node("bounded_tool_loop", self._bounded_tool_loop)
        graph.add_node("generate_answer", self._generate_answer)
        graph.add_node("save_assistant_message", self._save_assistant_message)

        graph.set_entry_point("validate_session")
        graph.add_edge("validate_session", "save_user_message")
        graph.add_edge("save_user_message", "plan_context")
        graph.add_conditional_edges(
            "plan_context",
            self._route_after_plan,
            {
                "loop": "bounded_tool_loop",
                "fast": "fast_tools",
            },
        )
        graph.add_edge("fast_tools", "generate_answer")
        graph.add_edge("bounded_tool_loop", "generate_answer")
        graph.add_edge("generate_answer", "save_assistant_message")
        graph.add_edge("save_assistant_message", END)
        return graph.compile()

    def _invoke_without_langgraph(self, state: ChatGraphState) -> ChatGraphState:
        state = self._validate_session(state)
        state = self._save_user_message(state)
        state = self._plan_context(state)
        state = self._bounded_tool_loop(state) if self._route_after_plan(state) == "loop" else self._fast_tools(state)
        state = self._generate_answer(state)
        return self._save_assistant_message(state)

    def _append_step(self, state: ChatGraphState, key: str, label: str) -> None:
        state.setdefault("steps", []).append(agent_step(key, label))

    def _is_complex_turn(self, user_content: str, upload_ctx: UploadContext) -> bool:
        lowered = f" {user_content.lower()} "
        has_marker = any(marker in lowered for marker in COMPLEX_MARKERS)
        multi_part = lowered.count("?") > 1 or lowered.count(" and ") >= 2
        has_upload_context = bool(upload_ctx.supplement_text)
        return has_marker or multi_part or has_upload_context

    def _validate_session(self, state: ChatGraphState) -> ChatGraphState:
        trace_id = state["trace_id"]
        session_id = state["session_id"]
        with traced_stage(trace_id, session_id, "chat.validate"):
            session = self.repo.get_session(state["db"], session_id)
            if state.get("auth_user") is not None:
                verify_session_user(session, state["auth_user"])
            uploads = self.repo.load_uploads(state["db"], session_id, state.get("upload_ids"))
        memory = get_memory_store()
        state["session"] = session
        state["uploads"] = uploads
        state["memory"] = memory
        state["session_summary"] = memory.get_summary(session)
        self._append_step(state, "understand", "Reading your question")
        return state

    def _save_user_message(self, state: ChatGraphState) -> ChatGraphState:
        trace_id = state["trace_id"]
        session_id = state["session_id"]
        uploads = state["uploads"]
        with traced_stage(trace_id, session_id, "chat.save_user"):
            user_row = self.repo.add_message(
                state["db"],
                session_id,
                "user",
                state["user_content"],
                self.upload_context.attachment_items(uploads) if uploads else None,
            )
            self.repo.set_initial_title(state["session"], state["user_content"])
            rows = self.repo.load_messages(state["db"], session_id)
            trimmed = trim_messages_for_llm(
                messages_to_dicts(rows),
                settings.chat_history_limit,
                settings.chat_history_max_chars,
            )
        state["user_row"] = user_row
        state["trimmed_messages"] = trimmed
        return state

    def _plan_context(self, state: ChatGraphState) -> ChatGraphState:
        trace_id = state["trace_id"]
        session_id = state["session_id"]
        with traced_stage(trace_id, session_id, "chat.plan"):
            plan = self.planner.build_plan(
                state["trimmed_messages"],
                state.get("session_summary"),
                state["user_content"],
            )
            upload_ctx = self.upload_context.build_context(state["uploads"])
        state["plan"] = plan
        state["upload_ctx"] = upload_ctx
        state["supplement_parts"] = [upload_ctx.supplement_text] if upload_ctx.supplement_text else []
        state["needs_verification"] = self.verification.is_needed(state["user_content"])
        state["use_autonomous_loop"] = self._is_complex_turn(state["user_content"], upload_ctx)
        state["tool_steps"] = 0
        self._append_step(state, "context", "Searching knowledge")
        return state

    def _route_after_plan(self, state: ChatGraphState) -> str:
        return "loop" if state.get("use_autonomous_loop") else "fast"

    def _fast_tools(self, state: ChatGraphState) -> ChatGraphState:
        trace_id = state["trace_id"]
        session_id = state["session_id"]
        upload_ctx = state["upload_ctx"]
        plan = state["plan"]
        with ThreadPoolExecutor(max_workers=2) as executor:
            retrieval_future = executor.submit(
                self.retrieval.retrieve,
                plan.query,
                upload_ctx.secondary_query,
            )
            verify_future = None
            if state.get("needs_verification"):
                self._append_step(state, "safety", "Checking safety")
                verify_future = executor.submit(
                    self.verification.verify,
                    state["user_content"],
                    plan.query,
                    upload_ctx.supplement_text,
                )
            with traced_stage(trace_id, session_id, "chat.retrieve"):
                context, sources = retrieval_future.result()
            if verify_future is not None:
                with traced_stage(trace_id, session_id, "chat.verify"):
                    verify_block = verify_future.result()
                    if verify_block:
                        state["supplement_parts"].append(verify_block)
        state["context"] = context
        state["sources"] = sources
        return state

    def _bounded_tool_loop(self, state: ChatGraphState) -> ChatGraphState:
        trace_id = state["trace_id"]
        session_id = state["session_id"]
        upload_ctx = state["upload_ctx"]
        plan = state["plan"]

        with traced_stage(trace_id, session_id, "chat.agent.retrieve"):
            context, sources = self.retrieval.retrieve(plan.query, upload_ctx.secondary_query)
            state["tool_steps"] += 1

        if state.get("needs_verification") and state["tool_steps"] < 3:
            self._append_step(state, "safety", "Checking safety")
            with traced_stage(trace_id, session_id, "chat.agent.verify"):
                verify_block = self.verification.verify(
                    state["user_content"],
                    plan.query,
                    upload_ctx.supplement_text,
                )
                state["tool_steps"] += 1
                if verify_block:
                    state["supplement_parts"].append(verify_block)

        if upload_ctx.supplement_text and state["tool_steps"] < 3:
            self._append_step(state, "compare", "Comparing sources")
            state["tool_steps"] += 1

        state["context"] = context
        state["sources"] = sources
        return state

    def _generate_answer(self, state: ChatGraphState) -> ChatGraphState:
        trace_id = state["trace_id"]
        session_id = state["session_id"]
        supplement = "\n\n".join(state["supplement_parts"]).strip() or None
        with traced_stage(trace_id, session_id, "chat.answer"):
            answer = self.answerer.answer(
                state["trimmed_messages"],
                state.get("session_summary"),
                state["context"],
                state.get("language"),
                supplement,
            )
        state["supplement"] = supplement
        state["answer"] = answer
        self._append_step(state, "answer", "Preparing answer")
        return state

    def _save_assistant_message(self, state: ChatGraphState) -> ChatGraphState:
        trace_id = state["trace_id"]
        session_id = state["session_id"]
        with traced_stage(trace_id, session_id, "chat.save_assistant"):
            state["memory"].merge_summary_delta(state["session"], state["plan"].summary_delta)
            self.repo.touch_session(state["session"])
            assistant_row = self.repo.add_message(
                state["db"],
                session_id,
                "assistant",
                state["answer"],
                state["sources"],
            )
            state["db"].commit()
            state["db"].refresh(state["user_row"])
            state["db"].refresh(assistant_row)
        state["assistant_row"] = assistant_row
        return state
