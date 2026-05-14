from __future__ import annotations

import uuid
from typing import Any

from app import chroma_store
from app.chunking import chunk_text
from app.config import settings
from app.embeddings import embed_texts


class UploadIndexingService:
    def index_parse(
        self,
        session_id: uuid.UUID,
        upload_id: uuid.UUID,
        original_filename: str,
        parsed: dict[str, Any],
    ) -> None:
        flat_text = str(parsed.get("flat_text") or "")
        chunks = chunk_text(flat_text, settings.chunk_size, settings.chunk_overlap)
        if not chunks:
            return
        texts = [c.text for c in chunks]
        vectors = embed_texts(texts, batch_size=32)
        metadatas = [
            {
                "source": original_filename,
                "source_type": "upload",
                "session_id": str(session_id),
                "upload_id": str(upload_id),
            }
            for _ in texts
        ]
        chroma_store.upsert_chunks(texts, metadatas, vectors)
