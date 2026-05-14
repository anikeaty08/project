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


def _extract_pdf_page_texts(data: bytes) -> list[str]:
    doc = pymupdf.open(stream=data, filetype="pdf")
    try:
        return [page.get_text().strip() for page in doc]
    finally:
        doc.close()


def _extract_pdf_text(data: bytes) -> str:
    return "\n".join(_extract_pdf_page_texts(data)).strip()


def _pdf_page_as_png_base64(data: bytes, page_index: int) -> str:
    doc = pymupdf.open(stream=data, filetype="pdf")
    try:
        pix = doc[page_index].get_pixmap(matrix=pymupdf.Matrix(1.5, 1.5))
        b64 = base64.standard_b64encode(pix.tobytes("png")).decode("ascii")
        return f"data:image/png;base64,{b64}"
    finally:
        doc.close()


def _extract_plain_text(data: bytes) -> str:
    return data.decode("utf-8", errors="ignore").strip()


def _fallback_parse(filename: str, text: str) -> PrescriptionDocumentResult:
    return PrescriptionDocumentResult(
        raw_notes=text[:2000],
        confidence=0.15,
        retrieval_query=(text or filename)[:500],
        provenance="fallback",
    )


def _merge_page_parses(pages: list[PrescriptionDocumentResult], filename: str) -> PrescriptionDocumentResult:
    if not pages:
        return _fallback_parse(filename, "")

    merged = PrescriptionDocumentResult(
        confidence=max((p.confidence for p in pages), default=0.0),
        provenance="page_extract",
    )
    seen_meds: set[tuple[str, str, str]] = set()
    notes: list[str] = []
    queries: list[str] = []
    for idx, parsed in enumerate(pages, start=1):
        if parsed.doctor and not merged.doctor:
            merged.doctor = parsed.doctor
        if parsed.date and not merged.date:
            merged.date = parsed.date
        for med in parsed.medications:
            key = (med.name.lower(), med.strength.lower(), med.frequency.lower())
            if key not in seen_meds:
                seen_meds.add(key)
                merged.medications.append(med)
        note = parsed.raw_notes.strip()
        if note:
            notes.append(f"Page {idx}: {note[:1800]}")
            merged.page_notes.append(f"Page {idx}: {note[:1000]}")
        query = parsed.retrieval_query.strip()
        if query:
            queries.append(query)

    merged.raw_notes = "\n".join(notes)[:8000]
    merged.retrieval_query = " ".join(queries).strip()[:600] or filename
    return merged


def _flatten_for_embedding(parsed: PrescriptionDocumentResult) -> str:
    lines = [
        "Prescription / document upload:",
        f"Doctor: {parsed.doctor}",
        f"Date: {parsed.date}",
        f"Notes: {parsed.raw_notes}",
    ]
    for med in parsed.medications:
        lines.append(f"Medication: {med.name} | {med.strength} | {med.frequency}")
    for page_note in parsed.page_notes:
        lines.append(page_note)
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
        page_texts = _extract_pdf_page_texts(file_bytes)
        page_parses: list[PrescriptionDocumentResult] = []
        vision_pages_used = 0
        for index, page_text in enumerate(page_texts):
            if len(page_text.strip()) >= settings.prescription_extraction_min_chars:
                page_parses.append(
                    PrescriptionDocumentResult(
                        raw_notes=page_text[:3000],
                        confidence=0.72,
                        retrieval_query=page_text[:500],
                        provenance="text_extract",
                    )
                )
                continue
            if vision_pages_used < settings.vision_pdf_max_pages:
                image_url = _pdf_page_as_png_base64(file_bytes, index)
                parsed_page = _vision_parse([image_url])
                parsed_page.provenance = "vision"
                page_parses.append(parsed_page)
                vision_pages_used += 1
            else:
                page_parses.append(
                    PrescriptionDocumentResult(
                        raw_notes=f"Page {index + 1} had little extractable text and was not processed by vision due to page limit.",
                        confidence=0.0,
                        retrieval_query=filename,
                        provenance="skipped_weak_page",
                    )
                )
        parsed = _merge_page_parses(page_parses, filename)
        return _normalize(parsed, filename)
    elif mime in ("text/plain", "text/markdown"):
        text = _extract_plain_text(file_bytes)

    weak_text = len(text.strip()) < settings.prescription_extraction_min_chars
    image_urls: list[str] = []
    provenance = "text_extract"

    if mime.startswith("image/"):
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
