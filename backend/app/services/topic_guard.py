from __future__ import annotations

import re
from difflib import SequenceMatcher

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

DOSHA_PROFILE_TERMS = {
    "thin",
    "medium",
    "heavy",
    "dry",
    "oily",
    "normal",
    "high",
    "moderate",
    "low",
    "calm",
    "intense",
    "steady",
    "body",
    "skin",
    "energy",
    "temperament",
}

HEALTH_CONCERN_TERMS = {
    "cancer",
    "diabetes",
    "hypertension",
    "bp",
    "thyroid",
    "asthma",
    "arthritis",
    "pcos",
    "pregnancy",
}

COMMON_HERB_ALIASES = {
    "ashvgandha": "ashwagandha",
    "ashvagandha": "ashwagandha",
    "aswagandha": "ashwagandha",
    "ashwaganda": "ashwagandha",
    "ashwagandhaa": "ashwagandha",
    "tulasi": "tulsi",
    "tulasee": "tulsi",
    "gudchi": "guduchi",
    "giloi": "giloy",
    "haldi": "turmeric",
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
    if any(term in text for term in AYURVEDA_TERMS):
        return True
    words = set(re.findall(r"[a-zA-Z]+", text))
    profile_matches = words & DOSHA_PROFILE_TERMS
    health_matches = words & HEALTH_CONCERN_TERMS
    if len(profile_matches) >= 2 or (profile_matches and health_matches):
        return True
    tokens = re.findall(r"[a-zA-Z]{4,}", text)
    canonical_herbs = {term for term in AYURVEDA_TERMS if term.isalpha() and len(term) >= 5}
    for token in tokens:
        if token in COMMON_HERB_ALIASES:
            return True
        if any(SequenceMatcher(None, token, herb).ratio() >= 0.84 for herb in canonical_herbs):
            return True
    return False


def off_topic_response() -> str:
    return (
        "I can only help with Ayurveda, herbs, plant identification, remedies, "
        "dosha, or medicine/prescription safety in this app. Please ask something "
        "related to that."
    )
