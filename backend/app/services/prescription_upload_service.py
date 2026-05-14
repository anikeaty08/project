from __future__ import annotations

import uuid
from pathlib import Path
from typing import Any

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app import chroma_store
from app.llm.tasks import (
    is_parse_weak,
    run_prescription_document_agent,
    run_prescription_verify_agent,
)
from app.chunking import chunk_text
from app.config import settings
from app.embeddings import embed_texts
from app.models.chat import ChatSession
from app.models.session_upload import SessionUpload

_MAX_UPLOADS_PER_SESSION = 80

_ALLOWED_MIME = frozenset(
    {
        "application/pdf",
        "text/plain",
        "text/markdown",
        "image/png",
        "image/jpeg",
        "image/webp",
    }
)


def _validate_mime(mime: str) -> str:
    m = (mime or "application/octet-stream").split(";")[0].strip().lower()
    if m not in _ALLOWED_MIME:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type: {m}. Allowed: {', '.join(sorted(_ALLOWED_MIME))}",
        )
    return m


def _upsert_upload_to_chroma(
    session_id: uuid.UUID,
    upload_id: uuid.UUID,
    original_filename: str,
    flat_text: str,
) -> None:
    chunks = chunk_text(flat_text, settings.chunk_size, settings.chunk_overlap)
    if not chunks:
        return
    texts = [c.text for c in chunks]
    vectors = embed_texts(texts, batch_size=32)
    metadatas: list[dict[str, Any]] = [
        {
            "source": original_filename,
            "source_type": "prescription_upload",
            "session_id": str(session_id),
            "upload_id": str(upload_id),
        }
        for _ in texts
    ]
    chroma_store.upsert_chunks(texts, metadatas, vectors)


def save_and_process_upload(
    db: Session,
    session_id: uuid.UUID,
    original_filename: str,
    mime_type: str,
    file_bytes: bytes,
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
    if n_uploads >= _MAX_UPLOADS_PER_SESSION:
        raise HTTPException(status_code=429, detail="Too many uploads for this session")

    mime = _validate_mime(mime_type)
    upload_id = uuid.uuid4()
    safe_name = Path(original_filename).name[:240] or "upload.bin"
    rel_dir = Path(str(session_id)) / str(upload_id)
    dest_dir = settings.upload_dir / rel_dir
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest_path = dest_dir / safe_name
    dest_path.write_bytes(file_bytes)

    parse = run_prescription_document_agent(safe_name, mime, file_bytes)
    verify: dict[str, Any] | None = None
    if is_parse_weak(parse) and settings.tavily_api_key:
        try:
            q = str(parse.get("retrieval_query") or parse.get("raw_notes") or safe_name)[:400]
            verify = run_prescription_verify_agent(
                search_query=q,
                context_from_document=str(parse.get("flat_text") or "")[:4000],
            )
        except Exception:
            verify = {
                "error": "verify_failed",
                "limitations": "Tavily or synthesis failed.",
            }

    row = SessionUpload(
        id=upload_id,
        session_id=session_id,
        storage_path=str(dest_path.resolve()),
        original_filename=safe_name,
        mime_type=mime,
        parse_result_json=parse,
        verify_result_json=verify,
    )
    db.add(row)
    db.commit()
    db.refresh(row)

    flat = str(parse.get("flat_text") or "")
    if flat.strip():
        _upsert_upload_to_chroma(session_id, upload_id, safe_name, flat)

    return row
