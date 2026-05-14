from __future__ import annotations

import re

from app.config import settings
from app.llm.agent_base import message
from app.llm.client import complete_json
from app.llm.json_utils import parse_model_or_fallback
from app.llm.schemas import PrescriptionIntentResult

PROMPT = """## Role / Domain
You are a narrow classification agent for prescription and medication-related chat.

## Primary Goal
Decide whether the user is asking about prescription paperwork, medications, drug names, dosages, interactions, pharmacy instructions, or medication safety.

## Behavior Rules
- Classify intent only.
- Do not provide medical advice.
- Do not explain your reasoning.
- Prefer false when the message is too vague or unrelated.

## Task Workflow
1. Read the user's message.
2. Check whether the topic is medication or prescription related.
3. Return the boolean classification.

## Special Instructions
- Include pharmacy instructions, dosage, side effects, interactions, and refill/generic questions as related.
- Exclude general Ayurveda/herb questions unless they mention medication or prescription safety.

## Output Format
Return only JSON:
{"prescription_related": true|false}
"""

KEYWORDS = (
    "prescription",
    "medication",
    "medicine",
    "medications",
    "drug",
    "dosage",
    "dose",
    "tablet",
    "pill",
    "capsule",
    "antibiotic",
    "insulin",
    "pharmacy",
    "rx ",
    " rx",
    "refill",
    "generic",
    "brand name",
    "side effect",
    "interaction",
    "contraindication",
    "fda",
    "take this",
    "twice daily",
    "mg",
    "mcg",
    "milligram",
)

PATTERNS = (re.compile(r"\b\d+\s*(mg|mcg|ml)\b"),)
MIN_INPUT_CHARS = 12
MAX_INPUT_CHARS = 4000


def keyword_match(text: str) -> bool:
    t = text.lower()
    if any(keyword in t for keyword in KEYWORDS):
        return True
    return any(pattern.search(t) for pattern in PATTERNS)


def run(text: str) -> bool:
    text = text.strip()
    if not text or len(text) < MIN_INPUT_CHARS:
        return False
    if keyword_match(text):
        return True
    if not settings.openai_api_key:
        return False

    raw = complete_json(
        model=settings.openai_chat_model,
        messages=[message("system", PROMPT), message("user", text[:MAX_INPUT_CHARS])],
        temperature=0,
    )
    result = parse_model_or_fallback(
        PrescriptionIntentResult,
        raw,
        PrescriptionIntentResult(prescription_related=False),
    )
    return bool(result.prescription_related)
