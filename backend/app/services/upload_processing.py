from __future__ import annotations

from pathlib import Path
from typing import Any

from app.models.session_upload import SessionUpload


PLANT_IMAGE_TERMS = (
    "plant",
    "leaf",
    "leaves",
    "flower",
    "fruit",
    "root",
    "stem",
    "herb",
    "tree",
    "shrub",
    "identify this",
    "what plant",
    "which plant",
    "konsi plant",
    "kaunsi plant",
    "yeh konsi",
    "ye kaunsi",
)

GENERIC_IMAGE_TERMS = (
    "image",
    "photo",
    "picture",
    "pic",
    "attached",
    "upload",
    "identify",
    "detect",
    "recognize",
    "what is this",
    "what's this",
)


def _contains_any(text: str, terms: tuple[str, ...]) -> bool:
    lowered = f" {text.lower()} "
    return any(term in lowered for term in terms)


class UploadProcessingService:
    def route_kind(
        self,
        mime_type: str,
        user_context: str | None,
        filename: str | None = None,
    ) -> str:
        from app.services import prescription_upload_service as compat

        is_image = (mime_type or "").startswith("image/")
        if not is_image:
            return "document"

        routing_text = " ".join(
            part.strip() for part in (user_context or "", filename or "") if part.strip()
        )
        if compat.is_prescription_keyword_match(routing_text):
            return "document"
        if _contains_any(routing_text, PLANT_IMAGE_TERMS):
            return "plant_image"
        if _contains_any(routing_text, GENERIC_IMAGE_TERMS):
            return "plant_image"
        return "plant_image"

    def process(self, upload: SessionUpload, user_context: str | None = None) -> dict[str, Any]:
        data = Path(upload.storage_path).read_bytes()
        if (
            self.route_kind(upload.mime_type, user_context, upload.original_filename)
            == "plant_image"
        ):
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
