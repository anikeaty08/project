from __future__ import annotations

from typing import Any

from app.config import settings
from app.llm.tasks import is_parse_weak, run_prescription_verify_agent
from app.models.session_upload import SessionUpload
from app.services.upload_processing import UploadProcessingService


class UploadVerificationService:
    def verify_if_needed(
        self,
        upload: SessionUpload,
        parsed: dict[str, Any],
        user_context: str | None = None,
    ) -> dict[str, Any] | None:
        if parsed.get("provenance") == "plant_vision":
            return None
        kind = UploadProcessingService().route_kind(upload.mime_type, user_context)
        if kind != "document" or not is_parse_weak(parsed) or not settings.tavily_api_key:
            return None
        try:
            q = str(
                parsed.get("retrieval_query")
                or parsed.get("raw_notes")
                or upload.original_filename
            )[:400]
            return run_prescription_verify_agent(
                search_query=q,
                context_from_document=str(parsed.get("flat_text") or "")[:4000],
            )
        except Exception as exc:
            return {
                "error": "verify_failed",
                "limitations": f"Tavily or synthesis failed: {exc.__class__.__name__}.",
            }
