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
    ctx1, src1 = retrieve_context(primary_query.strip() or " ", k_primary)
    ctx2, src2 = retrieve_context(sec, k_secondary)

    seen_docs: set[str] = set()
    blocks: list[str] = []
    sources: list[dict[str, Any]] = []
    rank = 0

    def _add_block(doc: str, meta: dict[str, Any], label: str) -> None:
        nonlocal rank
        key = (doc or "")[:240]
        if key in seen_docs:
            return
        seen_docs.add(key)
        rank += 1
        src = meta.get("source", "unknown")
        header = f"--- Source [{rank}] ({label}) {src} ---"
        blocks.append(f"{header}\n{doc}")
        sources.append(
            {
                "rank": rank,
                "source": src,
                "source_type": meta.get("source_type"),
                "snippet": (doc or "")[:400],
            }
        )

    for s in src1:
        idx = s["rank"] - 1
        docs = (ctx1 and True) or False
    # Re-query is simpler: walk paired from retrieve_context outputs by re-parsing context is messy.
    # Instead merge from two parallel retrieve calls using returned sources' snippets to dedupe.

    # Re-implement merge by calling embed twice and manual zip from chroma - too heavy.
    # Simpler approach: concatenate contexts with two labeled sections without renumbering duplicates
    # Plan asked merge ranked - use dedupe on full document text from second retrieve_context internals.
    # Easiest: parse ctx1 blocks and ctx2 blocks by splitting on "--- Source"
    import re as _re

    pat = _re.compile(r"--- Source \[\d+\][^\n]*---\n", _re.MULTILINE)

    def split_ctx(ctx: str) -> list[tuple[str, str]]:
        if not ctx.strip():
            return []
        parts = pat.split(ctx)
        headers = pat.findall(ctx)
        out: list[tuple[str, str]] = []
        for h, body in zip(headers, parts[1:], strict=False):
            out.append((h.strip(), body.strip()))
        return out

    pieces1 = split_ctx(ctx1)
    pieces2 = split_ctx(ctx2)
    for h, body in pieces1:
        doc = body
        key = doc[:240]
        if key in seen_docs:
            continue
        seen_docs.add(key)
        rank += 1
        new_h = _re.sub(r"\[\d+\]", f"[{rank}]", h, count=1)
        blocks.append(f"{new_h}\n{doc}")
        sources.append(
            {
                "rank": rank,
                "source": "session_retrieval",
                "source_type": None,
                "snippet": doc[:400],
            }
        )
    for h, body in pieces2:
        doc = body
        key = doc[:240]
        if key in seen_docs:
            continue
        seen_docs.add(key)
        rank += 1
        new_h = _re.sub(r"\[\d+\]", f"[{rank}]", h, count=1)
        blocks.append(f"{new_h}\n{doc}")
        sources.append(
            {
                "rank": rank,
                "source": "upload_retrieval",
                "source_type": "prescription_upload",
                "snippet": doc[:400],
            }
        )

    return "\n\n".join(blocks), sources


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
