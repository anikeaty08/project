from __future__ import annotations

import uuid
from typing import Any

import chromadb
from chromadb.config import Settings as ChromaSettings

from app.config import settings


COLLECTION_NAME = "rag_documents"


def get_client():
    settings.chroma_path.mkdir(parents=True, exist_ok=True)
    return chromadb.PersistentClient(
        path=str(settings.chroma_path),
        settings=ChromaSettings(anonymized_telemetry=False),
    )


def get_collection():
    client = get_client()
    return client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )


def upsert_chunks(
    documents: list[str],
    metadatas: list[dict[str, Any]],
    embeddings: list[list[float]],
) -> None:
    if not documents:
        return
    col = get_collection()
    batch = max(1, settings.chromadb_upsert_batch_size)
    for start in range(0, len(documents), batch):
        end = start + batch
        chunk_docs = documents[start:end]
        chunk_meta = metadatas[start:end]
        chunk_emb = embeddings[start:end]
        ids = [str(uuid.uuid4()) for _ in chunk_docs]
        col.upsert(
            ids=ids, documents=chunk_docs, metadatas=chunk_meta, embeddings=chunk_emb
        )


def query_collection(
    query_embedding: list[float],
    n_results: int,
) -> dict[str, Any]:
    col = get_collection()
    return col.query(
        query_embeddings=[query_embedding],
        n_results=n_results,
        include=["documents", "metadatas", "distances"],
    )


def clear_collection() -> None:
    client = get_client()
    try:
        client.delete_collection(COLLECTION_NAME)
    except Exception:
        pass
    get_collection()


def delete_by_session(session_id: str) -> None:
    col = get_collection()
    try:
        col.delete(where={"session_id": session_id})
    except Exception:
        pass
