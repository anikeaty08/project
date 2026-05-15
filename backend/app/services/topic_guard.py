from __future__ import annotations

import re
from difflib import SequenceMatcher
from typing import Any, Literal

TopicGuardResult = Literal["allowed", "contextual", "blocked"]

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

CONTEXTUAL_REPLIES = {
    "yes",
    "yeah",
    "yep",
    "ok",
    "okay",
    "continue",
    "go on",
    "tell me more",
    "more",
    "what about this",
    "explain this",
    "please explain",
}

CONTEXT_PROMPT_TERMS = {
    "body type",
    "skin type",
    "energy levels",
    "temperament",
    "health issues",
    "health concerns",
    "dosha",
    "prakriti",
    "symptoms",
    "concerns",
}


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text.lower()).strip()


def _words(text: str) -> set[str]:
    return set(re.findall(r"[a-zA-Z]+", text))


def _has_direct_domain_signal(text: str) -> bool:
    if any(term in text for term in AYURVEDA_TERMS):
        return True
    tokens = re.findall(r"[a-zA-Z]{4,}", text)
    canonical_herbs = {term for term in AYURVEDA_TERMS if term.isalpha() and len(term) >= 5}
    for token in tokens:
        if token in COMMON_HERB_ALIASES:
            return True
        if any(SequenceMatcher(None, token, herb).ratio() >= 0.84 for herb in canonical_herbs):
            return True
    return False


def _last_assistant_text(recent_messages: list[dict[str, Any]] | None) -> str:
    for message in reversed(recent_messages or []):
        if message.get("role") != "assistant":
            continue
        content = message.get("content")
        return _normalize(content) if isinstance(content, str) else ""
    return ""


def _looks_like_context_prompt(text: str) -> bool:
    return _has_direct_domain_signal(text) or any(term in text for term in CONTEXT_PROMPT_TERMS)


def classify_ayurveda_topic(
    user_content: str,
    has_uploads: bool = False,
    recent_messages: list[dict[str, Any]] | None = None,
) -> TopicGuardResult:
    text = _normalize(user_content)
    if not text:
        return "blocked"
    if has_uploads:
        return "allowed"
    if text in SMALL_TALK:
        return "allowed"
    if _has_direct_domain_signal(text):
        return "allowed"

    words = _words(text)
    profile_matches = words & DOSHA_PROFILE_TERMS
    health_matches = words & HEALTH_CONCERN_TERMS
    if len(profile_matches) >= 2 or (profile_matches and health_matches):
        return "allowed"

    previous_assistant = _last_assistant_text(recent_messages)
    if not previous_assistant or not _looks_like_context_prompt(previous_assistant):
        return "blocked"

    if text in CONTEXTUAL_REPLIES:
        return "contextual"
    if health_matches and (
        "health" in previous_assistant
        or "concern" in previous_assistant
        or "symptom" in previous_assistant
    ):
        return "contextual"
    if profile_matches and any(term in previous_assistant for term in CONTEXT_PROMPT_TERMS):
        return "contextual"

    return "blocked"


def is_ayurveda_related(
    user_content: str,
    has_uploads: bool = False,
    recent_messages: list[dict[str, Any]] | None = None,
) -> bool:
    return classify_ayurveda_topic(user_content, has_uploads, recent_messages) != "blocked"


def off_topic_response() -> str:
    return (
        "I am focused on Ayurveda, herbs, plant identification, remedies, dosha, "
        "and medicine or prescription safety. You can ask things like: "
        "\"What is my dosha from these traits?\", \"Is this herb safe with my medicine?\", "
        "or \"Can you identify this plant?\""
    )
