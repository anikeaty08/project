from __future__ import annotations

import uuid
from concurrent.futures import ThreadPoolExecutor
from typing import Any

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.config import settings
from app.memory import get_memory_store
from app.services.answer_service import AnswerService
from app.services.auth import verify_session_user, AuthUser
from app.services.chat_models import message_to_response
from app.services.chat_planner import ChatPlanner
from app.services.chat_repository import ChatRepository
from app.services.chat_verification import ChatVerificationService
from app.services.history_utils import messages_to_dicts, trim_messages_for_llm
from app.services.observability import new_trace_id, traced_stage
from app.services.retrieval_service import RetrievalService
from app.services.upload_context import UploadContextService


class ChatOrchestrator:
    def __init__(self) -> None:
        self.repo = ChatRepository()
        self.planner = ChatPlanner()
        self.upload_context = UploadContextService()
        self.retrieval = RetrievalService()
        self.verification = ChatVerificationService()
        self.answerer = AnswerService()

    def run_turn(
        self,
        db: Session,
        session_id: uuid.UUID,
        user_content: str,
        language: str | None,
        upload_ids: list[uuid.UUID] | None = None,
        auth_user: AuthUser | None = None,
    ) -> dict[str, Any]:
        trace_id = new_trace_id()
        user_content = user_content.strip()
        if not user_content:
            raise HTTPException(status_code=400, detail="Message content is empty")

        with traced_stage(trace_id, session_id, "chat.validate"):
            session = self.repo.get_session(db, session_id)
            if auth_user is not None:
                verify_session_user(session, auth_user)
            uploads = self.repo.load_uploads(db, session_id, upload_ids)

        memory = get_memory_store()
        session_summary = memory.get_summary(session)

        with traced_stage(trace_id, session_id, "chat.save_user"):
            user_row = self.repo.add_message(
                db,
                session_id,
                "user",
                user_content,
                self.upload_context.attachment_items(uploads) if uploads else None,
            )
            self.repo.set_initial_title(session, user_content)
            rows = self.repo.load_messages(db, session_id)
            dicts = messages_to_dicts(rows)
            trimmed = trim_messages_for_llm(
                dicts,
                settings.chat_history_limit,
                settings.chat_history_max_chars,
            )

        with traced_stage(trace_id, session_id, "chat.plan"):
            plan = self.planner.build_plan(trimmed, session_summary, user_content)
            upload_ctx = self.upload_context.build_context(uploads)

        supplement_parts = []
        if upload_ctx.supplement_text:
            supplement_parts.append(upload_ctx.supplement_text)

        with ThreadPoolExecutor(max_workers=2) as executor:
            retrieval_future = executor.submit(
                self.retrieval.retrieve,
                plan.query,
                upload_ctx.secondary_query,
            )
            verify_future = None
            if self.verification.is_needed(user_content):
                verify_future = executor.submit(
                    self.verification.verify,
                    user_content,
                    plan.query,
                    upload_ctx.supplement_text,
                )
            with traced_stage(trace_id, session_id, "chat.retrieve"):
                context, sources = retrieval_future.result()
            if verify_future is not None:
                with traced_stage(trace_id, session_id, "chat.verify"):
                    verify_block = verify_future.result()
                    if verify_block:
                        supplement_parts.append(verify_block)

        supplement = "\n\n".join(supplement_parts).strip() or None
        with traced_stage(trace_id, session_id, "chat.answer"):
            answer = self.answerer.answer(
                trimmed,
                session_summary,
                context,
                language,
                supplement,
            )

        with traced_stage(trace_id, session_id, "chat.save_assistant"):
            memory.merge_summary_delta(session, plan.summary_delta)
            self.repo.touch_session(session)
            assistant_row = self.repo.add_message(
                db,
                session_id,
                "assistant",
                answer,
                sources,
            )
            db.commit()
            db.refresh(user_row)
            db.refresh(assistant_row)

        return {
            "answer": answer,
            "sources": sources,
            "retrieval_query": plan.query,
            "trace_id": trace_id,
            "user_message_id": str(user_row.id),
            "assistant_message_id": str(assistant_row.id),
            "user_message": message_to_response(user_row),
            "assistant_message": message_to_response(assistant_row),
        }
