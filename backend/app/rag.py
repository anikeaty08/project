from __future__ import annotations

from typing import Any

from app import chroma_store
from app.agents.rag_answer_agent import run_rag_answer_agent
from app.config import settings
from app.embeddings import embed_query


def _last_user_message(messages: list[dict[str, Any]]) -> str:
    for m in reversed(messages):
        if m.get("role") == "user":
            c = m.get("content")
            return c if isinstance(c, str) else ""
    return ""


def retrieve_context(query: str, top_k: int | None = None) -> tuple[str, list[dict[str, Any]]]:
    k = top_k or settings.retrieval_top_k
    if not query.strip():
        return "", []

    q_emb = embed_query(query)
    res = chroma_store.query_collection(q_emb, n_results=k)

    documents = (res.get("documents") or [[]])[0]
    metadatas = (res.get("metadatas") or [[]])[0]

    blocks: list[str] = []
    sources: list[dict[str, Any]] = []
    for i, (doc, meta) in enumerate(zip(documents, metadatas), start=1):
        meta = meta or {}
        src = meta.get("source", "unknown")
        header = f"--- Source [{i}] {src} ---"
        blocks.append(f"{header}\n{doc}")
        sources.append(
            {
                "rank": i,
                "source": src,
                "source_type": meta.get("source_type"),
                "snippet": (doc or "")[:400],
            }
        )

    context = "\n\n".join(blocks)
    return context, sources


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
