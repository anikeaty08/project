from __future__ import annotations

from pathlib import Path
from typing import Any

from app.models.session_upload import SessionUpload


class UploadProcessingService:
    def route_kind(self, mime_type: str, user_context: str | None) -> str:
        from app.services import prescription_upload_service as compat

        is_image = (mime_type or "").startswith("image/")
        if is_image and not compat.is_prescription_keyword_match(user_context or ""):
            return "plant_image"
        return "document"

    def process(self, upload: SessionUpload, user_context: str | None = None) -> dict[str, Any]:
        data = Path(upload.storage_path).read_bytes()
        if self.route_kind(upload.mime_type, user_context) == "plant_image":
            from app.services import prescription_upload_service as compat

            return compat.run_plant_image_agent(
                upload.original_filename,
                upload.mime_type,
                data,
                user_context,
            )
        from app.services import prescription_upload_service as compat

        return compat.run_prescription_document_agent(
            upload.original_filename,
            upload.mime_type,
            data,
        )
