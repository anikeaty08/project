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
        answer = run_rag_answer_agent(
            messages,
            session_summary,
            context,
            language,
            supplement_block=supplement,
        )
        return ensure_citation(answer, context)


def ensure_citation(answer: str, context: str) -> str:
    if not context.strip() or "[" in answer:
        return answer
    return f"{answer.rstrip()}\n\nSource: [1]"
