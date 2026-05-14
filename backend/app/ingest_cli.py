"""Run from backend directory: python -m app.ingest_cli [--clear]"""

from __future__ import annotations

import argparse
import logging

from app.ingest.pipeline import run_ingest

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def main() -> None:
    p = argparse.ArgumentParser(description="Ingest data into ChromaDB")
    p.add_argument("--clear", action="store_true", help="Clear collection before ingest")
    p.add_argument(
        "--url-limit",
        type=int,
        default=None,
        help="Max number of URLs to fetch from Linkss.txt (default: all)",
    )
    args = p.parse_args()
    out = run_ingest(clear=args.clear, url_limit=args.url_limit)
    logger.info("Ingest complete: %s", out)


if __name__ == "__main__":
    main()
