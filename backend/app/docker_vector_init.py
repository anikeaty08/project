"""
Legacy Docker one-shot ingest helper (not wired in docker-compose).

Skips if marker file exists or collection already has rows.
Embeddings use local Sentence Transformers; OPENAI_API_KEY is only needed
if ingest triggers OpenAI elsewhere (e.g. optional tooling).
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

from app.config import settings

MARKER_NAME = ".vector_ingest_done"


def _marker_path() -> Path:
    return Path(settings.chroma_path) / MARKER_NAME


def _has_chroma_data() -> bool:
    try:
        from app import chroma_store

        col = chroma_store.get_collection()
        return col.count() > 0
    except Exception:
        return False


def _url_limit_from_env() -> int | None:
    """Default 0 (no Linkss URL crawl). Use AUTO_INGEST_URL_LIMIT=all for every URL."""
    raw = os.environ.get("AUTO_INGEST_URL_LIMIT")
    if raw is None:
        return 0
    raw = raw.strip()
    if raw == "" or raw.lower() in ("all", "none", "full"):
        return None
    return int(raw)


def main() -> int:
    Path(settings.chroma_path).mkdir(parents=True, exist_ok=True)
    marker = _marker_path()

    if marker.exists():
        print("vector-init: marker present; skipping ingest.")
        return 0
    if _has_chroma_data():
        print("vector-init: Chroma already populated; writing marker.")
        marker.touch()
        return 0

    ul = _url_limit_from_env()
    print(f"vector-init: first-time ingest (url_limit={ul!r}) …")
    from app.ingest.pipeline import run_ingest

    try:
        out = run_ingest(clear=True, url_limit=ul)
        print("vector-init: ingest OK:", out)
    except Exception as e:
        print("vector-init: ingest FAILED:", e, file=sys.stderr)
        return 1

    marker.touch()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
