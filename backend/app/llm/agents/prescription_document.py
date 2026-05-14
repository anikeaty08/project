from __future__ import annotations

import base64
from typing import Any

import pymupdf

from app.config import settings
from app.llm.agent_base import message
from app.llm.client import complete_json
from app.llm.json_utils import parse_model_or_fallback
from app.llm.schemas import MedicationItem, PrescriptionDocumentResult

PROMPT = """## Role / Domain
You are a document-reading agent for prescription and medication paperwork.

## Primary Goal
Extract structured fields from visible prescription, medication, or pharmacy paperwork.

## Behavior Rules
- Extract only what is visible or directly implied by the document.
- Do not diagnose.
- Do not recommend treatment.
- Do not invent medication names, strengths, dates, or doctors.
- Use empty strings or arrays for unknown fields.

## Task Workflow
1. Read the provided image or document text.
2. Identify medication names, strengths, and frequencies.
3. Identify doctor and date when visible.
4. Summarize visible raw notes.
5. Produce a retrieval query using medication names and strengths.
6. Estimate confidence from 0 to 1.

## Special Instructions
- If nothing is legible, return empty arrays/strings and confidence near 0.
- Keep retrieval_query one line with no pronouns.

## Output Format
Return only JSON:
{
  "medications": [{"name": string, "strength": string, "frequency": string}],
  "doctor": string,
  "date": string,
  "raw_notes": string,
  "confidence": number,
  "retrieval_query": string
}
"""


def _extract_pdf_text(data: bytes) -> str:
    doc = pymupdf.open(stream=data, filetype="pdf")
    try:
        return "\n".join(page.get_text() for page in doc).strip()
    finally:
        doc.close()


def _pdf_pages_as_png_base64(data: bytes, max_pages: int) -> list[str]:
    doc = pymupdf.open(stream=data, filetype="pdf")
    urls: list[str] = []
    try:
        for i in range(min(len(doc), max_pages)):
            pix = doc[i].get_pixmap(matrix=pymupdf.Matrix(1.5, 1.5))
            b64 = base64.standard_b64encode(pix.tobytes("png")).decode("ascii")
            urls.append(f"data:image/png;base64,{b64}")
    finally:
        doc.close()
    return urls


def _extract_plain_text(data: bytes) -> str:
    return data.decode("utf-8", errors="ignore").strip()


def _fallback_parse(filename: str, text: str) -> PrescriptionDocumentResult:
    return PrescriptionDocumentResult(
        raw_notes=text[:2000],
        confidence=0.15,
        retrieval_query=(text or filename)[:500],
        provenance="fallback",
    )


def _flatten_for_embedding(parsed: PrescriptionDocumentResult) -> str:
    lines = [
        "Prescription / document upload:",
        f"Doctor: {parsed.doctor}",
        f"Date: {parsed.date}",
        f"Notes: {parsed.raw_notes}",
    ]
    for med in parsed.medications:
        lines.append(f"Medication: {med.name} | {med.strength} | {med.frequency}")
    return "\n".join(lines).strip()


def _vision_parse(image_urls: list[str]) -> PrescriptionDocumentResult:
    content: list[dict[str, Any]] = [{"type": "text", "text": PROMPT}]
    for url in image_urls:
        content.append({"type": "image_url", "image_url": {"url": url}})
    raw = complete_json(
        model=settings.openai_vision_model,
        messages=[message("user", content)],
        temperature=0.1,
    )
    return parse_model_or_fallback(
        PrescriptionDocumentResult,
        raw,
        PrescriptionDocumentResult(confidence=0.0),
    )


def _normalize(parsed: PrescriptionDocumentResult, filename: str) -> dict[str, Any]:
    parsed.medications = [
        med if isinstance(med, MedicationItem) else MedicationItem()
        for med in (parsed.medications or [])
    ]
    if not parsed.retrieval_query.strip():
        parsed.retrieval_query = (parsed.raw_notes or filename)[:500]
    parsed.flat_text = _flatten_for_embedding(parsed)
    return parsed.model_dump()


def run(filename: str, mime_type: str, file_bytes: bytes) -> dict[str, Any]:
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
        text = ""
        provenance = "vision"

    if image_urls:
        parsed = _vision_parse(image_urls)
        parsed.provenance = provenance
    elif not weak_text and text:
        parsed = PrescriptionDocumentResult(
            raw_notes=text[:8000],
            confidence=0.72,
            retrieval_query=text[:600],
            provenance=provenance,
        )
        if len(parsed.retrieval_query.strip()) < 40:
            parsed = _fallback_parse(filename, text)
    else:
        parsed = _fallback_parse(filename, text)

    return _normalize(parsed, filename)


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
