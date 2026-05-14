from __future__ import annotations

import json
import re
from typing import Any

from openai import OpenAI

from app.config import settings

_KEYWORDS = (
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


def _keyword_prescription_intent(text: str) -> bool:
    t = text.lower()
    for k in _KEYWORDS:
        if k in t:
            return True
    if re.search(r"\b\d+\s*(mg|mcg|ml)\b", t):
        return True
    return False


def _mini_classifier(text: str) -> bool:
    if not settings.openai_api_key:
        return False
    client = OpenAI(api_key=settings.openai_api_key)
    completion = client.chat.completions.create(
        model=settings.openai_chat_model,
        messages=[
            {
                "role": "system",
                "content": (
                    "Classify if the user is asking about prescription paperwork, medications, "
                    "drug names, dosages, interactions, or pharmacy instructions. "
                    'Reply JSON only: {"prescription_related": true|false}'
                ),
            },
            {"role": "user", "content": text[:4000]},
        ],
        temperature=0,
        response_format={"type": "json_object"},
    )
    raw = completion.choices[0].message.content or "{}"
    try:
        data: dict[str, Any] = json.loads(raw)
        return bool(data.get("prescription_related"))
    except json.JSONDecodeError:
        return False


def is_prescription_related_message(text: str) -> bool:
    text = text.strip()
    if not text:
        return False
    if _keyword_prescription_intent(text):
        return True
    return _mini_classifier(text)
