from __future__ import annotations

import re

AYURVEDA_TERMS = {
    "ayurveda",
    "ayurvedic",
    "vaidya",
    "dosha",
    "vata",
    "pitta",
    "kapha",
    "prakriti",
    "vikriti",
    "panchakarma",
    "rasayana",
    "herb",
    "herbal",
    "plant",
    "leaf",
    "leaves",
    "flower",
    "root",
    "remedy",
    "remedies",
    "medicine",
    "medication",
    "tablet",
    "capsule",
    "dose",
    "dosage",
    "prescription",
    "safety",
    "interaction",
    "side effect",
    "tulsi",
    "ashwagandha",
    "turmeric",
    "haldi",
    "amla",
    "neem",
    "giloy",
    "triphala",
    "brahmi",
    "shatavari",
    "guggul",
    "saffron",
    "kesar",
    "haridra",
    "amalaki",
    "yeh konsi plant",
    "kaunsi plant",
}

SMALL_TALK = {
    "hi",
    "hello",
    "hey",
    "namaste",
    "thanks",
    "thank you",
}


def is_ayurveda_related(user_content: str, has_uploads: bool = False) -> bool:
    text = re.sub(r"\s+", " ", user_content.lower()).strip()
    if not text:
        return False
    if has_uploads:
        return True
    if text in SMALL_TALK:
        return True
    return any(term in text for term in AYURVEDA_TERMS)


def off_topic_response() -> str:
    return (
        "I can only help with Ayurveda, herbs, plant identification, remedies, "
        "dosha, or medicine/prescription safety in this app. Please ask something "
        "related to that."
    )
