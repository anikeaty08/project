from __future__ import annotations

from app.config import settings
from app.llm.tasks import (
    is_prescription_keyword_match,
    run_prescription_verify_agent,
    verify_result_to_prompt_block,
)


def verification_unavailable_block(reason: str) -> str:
    return (
        "WEB_VERIFICATION (informational only, not medical advice):\n"
        f"Limitations: {reason}"
    )


class ChatVerificationService:
    def is_needed(self, user_content: str) -> bool:
        return is_prescription_keyword_match(user_content)

    def verify(
        self,
        user_content: str,
        retrieval_query: str,
        upload_supplement: str | None,
    ) -> str | None:
        if not self.is_needed(user_content):
            return None
        if not settings.tavily_api_key:
            return verification_unavailable_block("TAVILY_API_KEY is not configured.")
        try:
            search_q = f"{user_content}\n{retrieval_query}".strip()[:450]
            result = run_prescription_verify_agent(
                search_query=search_q,
                context_from_document=(upload_supplement or "")[:4000] or None,
            )
            return verify_result_to_prompt_block(result)
        except Exception as exc:
            return verification_unavailable_block(
                f"Tavily verification failed: {exc.__class__.__name__}."
            )
