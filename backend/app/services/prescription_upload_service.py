from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.config import settings
from app.llm.tasks import (
    is_prescription_keyword_match,
    run_plant_image_agent,
    run_prescription_document_agent,
)
from app.models.session_upload import SessionUpload
from app.services.upload_indexing import UploadIndexingService
from app.services.upload_processing import UploadProcessingService
from app.services.upload_storage import UploadStorageService
from app.services.upload_verification import UploadVerificationService


def _upsert_upload_to_chroma(
    session_id: uuid.UUID,
    upload_id: uuid.UUID,
    original_filename: str,
    flat_text: str,
) -> None:
    UploadIndexingService().index_parse(
        session_id,
        upload_id,
        original_filename,
        {"flat_text": flat_text},
    )


def save_upload_queued(
    db: Session,
    session_id: uuid.UUID,
    original_filename: str,
    mime_type: str,
    file_bytes: bytes,
) -> SessionUpload:
    return UploadStorageService().create_upload_row(
        db,
        session_id,
        original_filename,
        mime_type,
        file_bytes,
        status="queued",
    )


def process_existing_upload(
    db: Session,
    upload: SessionUpload,
    user_context: str | None = None,
) -> SessionUpload:
    upload.status = "processing"
    upload.processing_error = None
    db.commit()
    db.refresh(upload)
    try:
        parse: dict[str, Any] = UploadProcessingService().process(upload, user_context)
        verify = UploadVerificationService().verify_if_needed(upload, parse, user_context)
        _upsert_upload_to_chroma(
            upload.session_id,
            upload.id,
            upload.original_filename,
            str(parse.get("flat_text") or ""),
        )
        upload.parse_result_json = parse
        upload.verify_result_json = verify
        upload.status = "completed"
        upload.processed_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(upload)
        return upload
    except Exception:
        upload.status = "failed"
        upload.processed_at = datetime.now(timezone.utc)
        db.commit()
        raise


def save_and_process_upload(
    db: Session,
    session_id: uuid.UUID,
    original_filename: str,
    mime_type: str,
    file_bytes: bytes,
    user_context: str | None = None,
) -> SessionUpload:
    row = UploadStorageService().create_upload_row(
        db,
        session_id,
        original_filename,
        mime_type,
        file_bytes,
        status="processing",
    )
    return process_existing_upload(db, row, user_context)
