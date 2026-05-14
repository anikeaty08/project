from __future__ import annotations

import base64
import json
import re
from typing import Any

import pymupdf
from openai import OpenAI

from app.config import settings

VISION_SCHEMA_PROMPT = """You are a document reader for prescription and medication paperwork only.
Extract structured fields from the image(s). Do not diagnose or recommend treatment.

Return ONLY valid JSON with keys:
- medications: array of { "name": string, "strength": string, "frequency": string } (use [] if unknown)
- doctor: string or ""
- date: string or ""
- raw_notes: string (transcribed visible text summary)
- confidence: number 0-1 (how sure you are)
- retrieval_query: one line string with drug names and strengths for search (no pronouns)

If nothing is legible, use empty arrays and confidence near 0.
"""


def _extract_pdf_text(data: bytes) -> str:
    doc = pymupdf.open(stream=data, filetype="pdf")
    try:
        parts: list[str] = []
        for page in doc:
            parts.append(page.get_text())
        return "\n".join(parts).strip()
    finally:
        doc.close()


def _pdf_pages_as_png_base64(data: bytes, max_pages: int) -> list[str]:
    doc = pymupdf.open(stream=data, filetype="pdf")
    urls: list[str] = []
    try:
        n = min(len(doc), max_pages)
        for i in range(n):
            page = doc[i]
            pix = page.get_pixmap(matrix=pymupdf.Matrix(1.5, 1.5))
            b64 = base64.standard_b64encode(pix.tobytes("png")).decode("ascii")
            urls.append(f"data:image/png;base64,{b64}")
    finally:
        doc.close()
    return urls


def _extract_plain_text(data: bytes) -> str:
    return data.decode("utf-8", errors="ignore").strip()


def _parse_json_obj(raw: str) -> dict[str, Any]:
    raw = raw.strip()
    m = re.search(r"\{[\s\S]*\}", raw)
    if m:
        raw = m.group(0)
    return json.loads(raw)


def _default_parse(filename: str, text: str) -> dict[str, Any]:
    return {
        "medications": [],
        "doctor": "",
        "date": "",
        "raw_notes": text[:2000],
        "confidence": 0.15,
        "retrieval_query": (text or filename)[:500],
        "provenance": "fallback",
    }


def _flatten_for_embedding(parsed: dict[str, Any]) -> str:
    lines = [
        "Prescription / document upload:",
        f"Doctor: {parsed.get('doctor', '')}",
        f"Date: {parsed.get('date', '')}",
        f"Notes: {parsed.get('raw_notes', '')}",
    ]
    for m in parsed.get("medications") or []:
        if isinstance(m, dict):
            lines.append(
                f"Medication: {m.get('name','')} | {m.get('strength','')} | {m.get('frequency','')}"
            )
    return "\n".join(lines).strip()


def _vision_parse(client: OpenAI, image_urls: list[str]) -> dict[str, Any]:
    content: list[dict[str, Any]] = [{"type": "text", "text": VISION_SCHEMA_PROMPT}]
    for url in image_urls:
        content.append({"type": "image_url", "image_url": {"url": url}})
    completion = client.chat.completions.create(
        model=settings.openai_vision_model,
        messages=[{"role": "user", "content": content}],
        temperature=0.1,
        response_format={"type": "json_object"},
    )
    raw = completion.choices[0].message.content or "{}"
    try:
        return _parse_json_obj(raw)
    except json.JSONDecodeError:
        return _default_parse("", "")


def run_prescription_document_agent(
    filename: str,
    mime_type: str,
    file_bytes: bytes,
) -> dict[str, Any]:
    if not settings.openai_api_key:
        raise ValueError("OPENAI_API_KEY is not set")

    mime = (mime_type or "").split(";")[0].strip().lower()
    text = ""
    if mime == "application/pdf":
        text = _extract_pdf_text(file_bytes)
    elif mime in ("text/plain", "text/markdown"):
        text = _extract_plain_text(file_bytes)

    weak_text = len(text.strip()) < settings.prescription_extraction_min_chars

    image_urls: list[str] = []
    provenance = "text_extract"

    if mime == "application/pdf" and weak_text:
        image_urls = _pdf_pages_as_png_base64(file_bytes, settings.vision_pdf_max_pages)
        provenance = "vision"
    elif mime.startswith("image/"):
        b64 = base64.standard_b64encode(file_bytes).decode("ascii")
        image_urls = [f"data:{mime};base64,{b64}"]
        provenance = "vision"
        text = ""

    client = OpenAI(api_key=settings.openai_api_key)

    if image_urls:
        parsed = _vision_parse(client, image_urls)
        parsed["provenance"] = provenance
    elif not weak_text and text:
        parsed = {
            "medications": [],
            "doctor": "",
            "date": "",
            "raw_notes": text[:8000],
            "confidence": 0.72,
            "retrieval_query": text[:600],
            "provenance": provenance,
        }
        if len((parsed.get("retrieval_query") or "").strip()) < 40:
            parsed = _default_parse(filename, text)
    else:
        parsed = _default_parse(filename, text)

    for key in ("medications", "doctor", "date", "raw_notes", "confidence", "retrieval_query"):
        if key not in parsed:
            parsed[key] = [] if key == "medications" else (0.0 if key == "confidence" else "")

    if not isinstance(parsed.get("medications"), list):
        parsed["medications"] = []

    parsed["flat_text"] = _flatten_for_embedding(parsed)
    if not (parsed.get("retrieval_query") or "").strip():
        parsed["retrieval_query"] = (parsed.get("raw_notes") or filename)[:500]

    return parsed


def is_parse_weak(parsed: dict[str, Any]) -> bool:
    notes = str(parsed.get("raw_notes") or "")
    rq = str(parsed.get("retrieval_query") or "")
    meds = parsed.get("medications") or []
    conf = float(parsed.get("confidence") or 0)
    if len(notes.strip()) < settings.prescription_extraction_min_chars and len(rq.strip()) < 40:
        return True
    if not meds and conf < 0.45:
        return True
    if conf < 0.35:
        return True
    return False
