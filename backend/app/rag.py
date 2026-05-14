from __future__ import annotations

from typing import Any

from app import chroma_store
from app.config import settings
from app.embeddings import embed_query
from app.llm.tasks import run_rag_answer_agent


def _last_user_message(messages: list[dict[str, Any]]) -> str:
    for m in reversed(messages):
        if m.get("role") == "user":
            c = m.get("content")
            return c if isinstance(c, str) else ""
    return ""


def _retrieve_chunk_rows(query: str, top_k: int) -> list[tuple[str, dict[str, Any]]]:
    if not query.strip():
        return []
    q_emb = embed_query(query)
    res = chroma_store.query_collection(q_emb, n_results=top_k)
    documents = (res.get("documents") or [[]])[0]
    metadatas = (res.get("metadatas") or [[]])[0]
    return [(d or "", (m or {})) for d, m in zip(documents, metadatas, strict=False)]


def retrieve_context(query: str, top_k: int | None = None) -> tuple[str, list[dict[str, Any]]]:
    k = top_k or settings.retrieval_top_k
    rows = _retrieve_chunk_rows(query, k)
    blocks: list[str] = []
    sources: list[dict[str, Any]] = []
    for i, (doc, meta) in enumerate(rows, start=1):
        src = meta.get("source", "unknown")
        header = f"--- Source [{i}] {src} ---"
        blocks.append(f"{header}\n{doc}")
        sources.append(
            {
                "rank": i,
                "source": src,
                "source_type": meta.get("source_type"),
                "snippet": doc[:400],
            }
        )
    return "\n\n".join(blocks), sources


def retrieve_context_merged(
    primary_query: str,
    secondary_query: str | None,
    top_k: int | None = None,
) -> tuple[str, list[dict[str, Any]]]:
    k = top_k or settings.retrieval_top_k
    sec = (secondary_query or "").strip()
    if not sec:
        return retrieve_context(primary_query, k)

    k_primary = max(2, (k + 1) // 2)
    k_secondary = max(1, k - k_primary)
    rows1 = _retrieve_chunk_rows(primary_query.strip() or " ", k_primary)
    rows2 = _retrieve_chunk_rows(sec, k_secondary)

    seen_docs: set[str] = set()
    blocks: list[str] = []
    sources: list[dict[str, Any]] = []
    rank = 0

    def _append_row(doc: str, meta: dict[str, Any], query_label: str) -> None:
        nonlocal rank
        key = doc[:240]
        if key in seen_docs:
            return
        seen_docs.add(key)
        rank += 1
        src = meta.get("source", "unknown")
        st = meta.get("source_type")
        header = f"--- Source [{rank}] ({query_label}) {src} ---"
        blocks.append(f"{header}\n{doc}")
        sources.append(
            {
                "rank": rank,
                "source": src,
                "source_type": st,
                "snippet": doc[:400],
            }
        )

    for doc, meta in rows1:
        _append_row(doc, meta, "session_query")
    for doc, meta in rows2:
        _append_row(doc, meta, "upload_query")

    return "\n\n".join(blocks), sources


def chat_with_rag(
    messages: list[dict[str, Any]],
    language: str | None = None,
) -> tuple[str, list[dict[str, Any]]]:
    if not settings.openai_api_key:
        raise ValueError("OPENAI_API_KEY is not set")

    user_q = _last_user_message(messages)
    context, sources = retrieve_context(user_q)
    answer = run_rag_answer_agent(messages, None, context, language)
    return answer, sources
