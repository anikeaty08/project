from __future__ import annotations

from typing import Any

from app.llm.tasks import verify_result_to_prompt_block
from app.models.session_upload import SessionUpload
from app.services.chat_models import UploadContext
from app.services.upload_storage import upload_file_url


class UploadContextService:
    def attachment_items(self, upload_rows: list[SessionUpload]) -> list[dict[str, Any]]:
        return [
            {
                "type": "attachment",
                "upload_id": str(row.id),
                "filename": row.original_filename,
                "mime_type": row.mime_type,
                "url": upload_file_url(row),
                "status": row.status,
            }
            for row in upload_rows
        ]

    def build_context(self, upload_rows: list[SessionUpload]) -> UploadContext:
        queries: list[str] = []
        blocks: list[str] = []
        pending: list[str] = []
        for upload in upload_rows:
            status = getattr(upload, "status", None) or "completed"
            if status != "completed":
                pending.append(
                    f"{upload.original_filename} is still {status}; upload analysis is not ready yet."
                )
                continue
            parsed = upload.parse_result_json or {}
            q = str(parsed.get("retrieval_query") or "").strip()
            if q:
                queries.append(q)
            flat = str(parsed.get("flat_text") or "").strip()
            if flat:
                blocks.append(f"USER_UPLOAD {upload.original_filename}:\n{flat[:2200]}")
            verify = upload.verify_result_json
            if isinstance(verify, dict) and verify:
                blocks.append(verify_result_to_prompt_block(verify))

        if pending:
            blocks.append(
                "UPLOAD_PROCESSING_STATUS:\n" + "\n".join(f"- {p}" for p in pending)
            )
        secondary = " ".join(queries).strip()[:1200] if queries else None
        supplement = "\n\n".join(blocks).strip() or None
        return UploadContext(
            secondary_query=secondary,
            supplement_text=supplement,
            pending_notes=pending,
        )
