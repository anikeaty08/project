from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

import httpx
import pymupdf
import trafilatura

from app.config import settings
from app.ingest.herb_formatter import herb_record_to_document

URL_RE = re.compile(r"https?://[^\s\)\]<>\"']+")


def extract_urls_from_link_file(path: Path) -> list[str]:
    raw = path.read_text(encoding="utf-8", errors="ignore")
    urls = URL_RE.findall(raw)
    seen: set[str] = set()
    out: list[str] = []
    for u in urls:
        u = u.rstrip(".,;)")
        if u not in seen:
            seen.add(u)
            out.append(u)
    return out


def fetch_url_text(url: str) -> str:
    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; RAGIngest/1.0; +local research)",
    }
    with httpx.Client(
        timeout=settings.url_fetch_timeout,
        follow_redirects=True,
        headers=headers,
    ) as client:
        r = client.get(url)
        r.raise_for_status()
        body = r.content[: settings.max_url_bytes]

    ctype = (r.headers.get("content-type") or "").lower()
    if "html" in ctype:
        extracted = trafilatura.extract(body, url=url)
        if extracted and extracted.strip():
            return extracted.strip()
        return body.decode("utf-8", errors="ignore")

    return body.decode("utf-8", errors="ignore")


def read_pdf_text(path: Path) -> str:
    doc = pymupdf.open(path)
    try:
        parts: list[str] = []
        for page in doc:
            parts.append(page.get_text())
        return "\n".join(parts)
    finally:
        doc.close()


def read_plain_path(path: Path) -> str:
    if path.suffix.lower() == ".pdf":
        return read_pdf_text(path)
    return path.read_text(encoding="utf-8", errors="ignore")


def load_herb_documents(herb_json_path: Path) -> list[tuple[str, dict[str, Any]]]:
    data = json.loads(herb_json_path.read_text(encoding="utf-8"))
    if not isinstance(data, list):
        return []
    out: list[tuple[str, dict[str, Any]]] = []
    for item in data:
        if not isinstance(item, dict):
            continue
        name = str(item.get("name", "unknown"))
        text = herb_record_to_document(item)
        meta: dict[str, Any] = {
            "source": str(herb_json_path),
            "source_type": "herb_json",
            "herb_name": name,
        }
        out.append((text, meta))
    return out


def discover_file_sources(data_dir: Path) -> list[Path]:
    patterns = ("*.txt", "*.md", "*.pdf")
    paths: list[Path] = []
    for pat in patterns:
        paths.extend(data_dir.rglob(pat))
    skip_names = {
        "LICENSE",
        "CODE_OF_CONDUCT.md",
        "CONTRIBUTING.md",
        "CITATION.cff",
    }
    out: list[Path] = []
    for p in paths:
        if p.name in skip_names:
            continue
        if "herb.json" in str(p).replace("\\", "/"):
            continue
        if p.name.lower() == "linkss.txt":
            continue
        out.append(p)
    return sorted(set(out))
