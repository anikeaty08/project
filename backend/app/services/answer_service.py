from __future__ import annotations

from typing import Any

from app.llm.tasks import run_rag_answer_agent


class AnswerService:
    def answer(
        self,
        messages: list[dict[str, Any]],
        session_summary: str | None,
        context: str,
        language: str | None,
        supplement: str | None,
    ) -> str:
        return run_rag_answer_agent(
            messages,
            session_summary,
            context,
            language,
            supplement_block=supplement,
        )
