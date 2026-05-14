from __future__ import annotations

import base64
from typing import Any

from app.config import settings
from app.llm.agent_base import message
from app.llm.client import complete_json
from app.llm.json_utils import parse_model_or_fallback
from app.llm.schemas import PlantImageResult

PROMPT = """## Role / Domain
You are a plant image identification agent for an Ayurveda and herb reference chat app.

## Primary Goal
Identify the most likely plant or herb visible in the uploaded image, using the user's message as context when provided.

## Behavior Rules
- Use only visible image evidence plus the user's provided context.
- Do not pretend certainty when the image is unclear, partial, low resolution, or lacks flowers/leaves needed for identification.
- Do not diagnose illness or recommend treatment.
- Do not invent citations, dataset matches, or medicinal claims.
- Prefer a likely common plant name and botanical name when reasonably inferable.

## Task Workflow
1. Inspect the uploaded plant image.
2. Use the user's message only to understand what they want identified.
3. List visible traits that support the identification.
4. Estimate confidence from 0 to 1.
5. Write a short retrieval query for herb/Ayurveda reference enrichment.

## Special Instructions
- If the image is not a plant, say so in uncertainty and keep names empty.
- If several plants are plausible, choose the best candidate and mention alternatives in uncertainty.
- Keep retrieval_query one line and include both common and botanical names when available.

## Output Format
Return only JSON:
{
  "likely_name": string,
  "botanical_name": string,
  "confidence": number,
  "visual_evidence": [string],
  "uncertainty": string,
  "retrieval_query": string,
  "raw_notes": string
}
"""


def _flatten_for_embedding(parsed: PlantImageResult) -> str:
    evidence = "; ".join(e for e in parsed.visual_evidence if e.strip())
    lines = [
        "Plant image identification upload:",
        f"Likely plant: {parsed.likely_name}",
        f"Botanical name: {parsed.botanical_name}",
        f"Confidence: {parsed.confidence:.2f}",
        f"Visible evidence: {evidence}",
        f"Uncertainty: {parsed.uncertainty}",
        f"Notes: {parsed.raw_notes}",
    ]
    return "\n".join(lines).strip()


def _normalize(parsed: PlantImageResult, filename: str) -> dict[str, Any]:
    parsed.visual_evidence = [
        str(item).strip() for item in (parsed.visual_evidence or []) if str(item).strip()
    ][:8]
    if not parsed.retrieval_query.strip():
        parsed.retrieval_query = " ".join(
            part
            for part in (parsed.likely_name, parsed.botanical_name, filename)
            if part.strip()
        )[:500]
    parsed.provenance = "plant_vision"
    parsed.flat_text = _flatten_for_embedding(parsed)
    return parsed.model_dump()


def run(
    filename: str,
    mime_type: str,
    file_bytes: bytes,
    user_context: str | None = None,
) -> dict[str, Any]:
    if not settings.openai_api_key:
        raise ValueError("OPENAI_API_KEY is not set")

    mime = (mime_type or "image/jpeg").split(";")[0].strip().lower()
    b64 = base64.standard_b64encode(file_bytes).decode("ascii")
    user_text = (user_context or "").strip()
    context = (
        f"Filename: {filename}\n"
        f"User message: {user_text or '(none)'}\n\n"
        f"{PROMPT}"
    )
    raw = complete_json(
        model=settings.openai_plant_vision_model,
        messages=[
            message(
                "user",
                [
                    {"type": "text", "text": context},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:{mime};base64,{b64}"},
                    },
                ],
            )
        ],
        temperature=0.1,
    )
    result = parse_model_or_fallback(
        PlantImageResult,
        raw,
        PlantImageResult(
            confidence=0.0,
            uncertainty="Could not parse plant image identification output.",
            retrieval_query=filename,
            raw_notes="Plant image analysis failed.",
        ),
    )
    return _normalize(result, filename)
