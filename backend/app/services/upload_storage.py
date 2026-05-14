from __future__ import annotations

import uuid
from pathlib import Path

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import settings
from app.models.chat import ChatSession
from app.models.session_upload import SessionUpload
from app.services.observability import new_trace_id

MAX_UPLOADS_PER_SESSION = 80
ALLOWED_MIME = frozenset(
    {
        "application/pdf",
        "text/plain",
        "text/markdown",
        "image/png",
        "image/jpeg",
        "image/webp",
    }
)


def validate_mime(mime: str) -> str:
    m = (mime or "application/octet-stream").split(";")[0].strip().lower()
    if m not in ALLOWED_MIME:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type: {m}. Allowed: {', '.join(sorted(ALLOWED_MIME))}",
        )
    return m


class UploadStorageService:
    def create_upload_row(
        self,
        db: Session,
        session_id: uuid.UUID,
        original_filename: str,
        mime_type: str,
        file_bytes: bytes,
        *,
        status: str = "queued",
        trace_id: str | None = None,
    ) -> SessionUpload:
        if len(file_bytes) > settings.max_upload_mb * 1024 * 1024:
            raise HTTPException(
                status_code=413,
                detail=f"File exceeds max size of {settings.max_upload_mb} MB",
            )
        sess = db.get(ChatSession, session_id)
        if sess is None:
            raise HTTPException(status_code=404, detail="Session not found")

        n_uploads = db.scalar(
            select(func.count()).select_from(SessionUpload).where(
                SessionUpload.session_id == session_id
            )
        ) or 0
        if n_uploads >= MAX_UPLOADS_PER_SESSION:
            raise HTTPException(status_code=429, detail="Too many uploads for this session")

        mime = validate_mime(mime_type)
        upload_id = uuid.uuid4()
        safe_name = Path(original_filename).name[:240] or "upload.bin"
        rel_dir = Path(str(session_id)) / str(upload_id)
        dest_dir = settings.upload_dir / rel_dir
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest_path = dest_dir / safe_name
        dest_path.write_bytes(file_bytes)

        row = SessionUpload(
            id=upload_id,
            session_id=session_id,
            storage_path=str(dest_path.resolve()),
            original_filename=safe_name,
            mime_type=mime,
            status=status,
            trace_id=trace_id or new_trace_id(),
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        return row


def upload_file_url(row: SessionUpload) -> str:
    return f"/sessions/{row.session_id}/uploads/{row.id}/file"
