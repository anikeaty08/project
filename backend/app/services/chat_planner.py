from __future__ import annotations

from typing import Any

from app.config import settings
from app.llm.tasks import run_session_query_agent
from app.services.chat_models import RetrievalPlan

QUERY_PRONOUNS = {
    "it",
    "this",
    "that",
    "they",
    "them",
    "these",
    "those",
    "he",
    "she",
    "its",
    "unka",
    "iske",
    "iska",
    "yeh",
    "ye",
    "woh",
    "uska",
}


def should_plan_retrieval_query(
    messages: list[dict[str, Any]],
    session_summary: str | None,
    latest_user_content: str,
) -> bool:
    prior_turns = [
        m
        for m in messages[:-1]
        if m.get("role") in ("user", "assistant") and str(m.get("content") or "").strip()
    ]
    if not prior_turns and not (session_summary or "").strip():
        return False
    words = {
        token.strip(".,!?;:()[]{}\"'").lower()
        for token in latest_user_content.split()
    }
    if words & QUERY_PRONOUNS:
        return True
    return bool((session_summary or "").strip() and len(latest_user_content) < 40)


class ChatPlanner:
    def build_plan(
        self,
        trimmed_messages: list[dict[str, Any]],
        session_summary: str | None,
        user_content: str,
    ) -> RetrievalPlan:
        if should_plan_retrieval_query(trimmed_messages, session_summary, user_content):
            query, delta = run_session_query_agent(
                trimmed_messages,
                session_summary,
                user_content,
            )
            return RetrievalPlan(query=query, summary_delta=delta)
        return RetrievalPlan(query=user_content[:500], summary_delta="")
