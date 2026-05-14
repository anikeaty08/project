from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

from app.chunking import chunk_text
from app.config import settings
from app.embeddings import embed_texts
from app.ingest.loaders import (
    discover_file_sources,
    extract_urls_from_link_file,
    fetch_url_text,
    load_herb_documents,
    read_plain_path,
)
from app import chroma_store

logger = logging.getLogger(__name__)


def _clean_metadata(meta: dict[str, Any]) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for k, v in meta.items():
        if v is None:
            continue
        if isinstance(v, (str, int, float, bool)):
            out[k] = v
        else:
            out[k] = str(v)
    return out


def _gather_raw_documents(data_dir: Path, url_limit: int | None = None) -> list[tuple[str, dict[str, Any]]]:
    docs: list[tuple[str, dict[str, Any]]] = []

    herb_path = data_dir / "herb-database-main" / "herb-database-main" / "herb.json"
    if not herb_path.is_file():
        alt = list(data_dir.rglob("herb.json"))
        herb_path = alt[0] if alt else None
    if herb_path and herb_path.is_file():
        herb_docs = load_herb_documents(herb_path)
        docs.extend(herb_docs)
        logger.info("Loaded %s herb records from %s", len(herb_docs), herb_path)

    link_file = data_dir / "Linkss.txt"
    if link_file.is_file():
        urls = extract_urls_from_link_file(link_file)
        if url_limit is not None and url_limit >= 0:
            urls = urls[:url_limit]
        logger.info("Found %s URLs to fetch from Linkss.txt (after limit)", len(urls))
        for i, url in enumerate(urls):
            try:
                text = fetch_url_text(url)
                if len(text.strip()) < 80:
                    logger.warning("Skipping short fetch for %s", url)
                    continue
                meta = {"source": url, "source_type": "url", "url_index": str(i)}
                docs.append((text, meta))
            except Exception as e:
                logger.warning("Failed to fetch %s: %s", url, e)

    for path in discover_file_sources(data_dir):
        try:
            text = read_plain_path(path)
            if len(text.strip()) < 80:
                continue
            meta = {
                "source": str(path),
                "source_type": path.suffix.lower().lstrip("."),
            }
            docs.append((text, meta))
        except Exception as e:
            logger.warning("Failed to read %s: %s", path, e)

    return docs


def run_ingest(clear: bool = False, url_limit: int | None = None) -> dict[str, Any]:
    data_dir = settings.data_dir.resolve()
    if not data_dir.is_dir():
        raise FileNotFoundError(f"DATA_DIR is not a directory: {data_dir}")

    if clear:
        chroma_store.clear_collection()

    raw = _gather_raw_documents(data_dir, url_limit=url_limit)
    all_docs: list[str] = []
    all_meta: list[dict[str, Any]] = []

    for text, meta in raw:
        for ch in chunk_text(text, settings.chunk_size, settings.chunk_overlap):
            m = _clean_metadata({**dict(meta), "chunk_index": str(ch.index)})
            all_docs.append(ch.text)
            all_meta.append(m)

    if not all_docs:
        return {
            "chunks": 0,
            "message": "No documents ingested",
            "raw_sources": 0,
            "data_dir": str(data_dir),
        }

    embeddings = embed_texts(all_docs)
    chroma_store.upsert_chunks(all_docs, all_meta, embeddings)
    return {
        "chunks": len(all_docs),
        "raw_sources": len(raw),
        "data_dir": str(data_dir),
    }
