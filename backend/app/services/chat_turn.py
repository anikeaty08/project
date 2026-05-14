from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy.orm import Session

from app.llm.tasks import verify_result_to_prompt_block
from app.models.session_upload import SessionUpload
from app.services.auth import AuthUser
from app.services.chat_orchestrator import ChatOrchestrator
from app.services.chat_planner import should_plan_retrieval_query
from app.services.upload_context import UploadContextService


def _upload_supplement_text(upload_rows: list[SessionUpload]) -> str:
    return UploadContextService().build_context(upload_rows).supplement_text or ""


def _verification_unavailable_block(reason: str) -> str:
    return (
        "WEB_VERIFICATION (informational only, not medical advice):\n"
        f"Limitations: {reason}"
    )


def run_chat_turn(
    db: Session,
    session_id: uuid.UUID,
    user_content: str,
    language: str | None,
    upload_ids: list[uuid.UUID] | None = None,
    owner_token: str | None = None,
    auth_user: AuthUser | None = None,
) -> dict[str, Any]:
    return ChatOrchestrator().run_turn(
        db,
        session_id,
        user_content,
        language,
        upload_ids=upload_ids,
        auth_user=auth_user,
    )


__all__ = [
    "run_chat_turn",
    "should_plan_retrieval_query",
    "_upload_supplement_text",
    "_verification_unavailable_block",
    "verify_result_to_prompt_block",
]
