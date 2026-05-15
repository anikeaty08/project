from __future__ import annotations

import re


def requested_language(text: str) -> str | None:
    normalized = re.sub(r"\s+", " ", text.lower()).strip()
    if "ಕನ್ನಡ" in text or "kannada" in normalized:
        return "kn"
    return None


def language_acknowledgement(language: str) -> str:
    if language == "kn":
        return "ಖಂಡಿತ. ಇಂದಿನಿಂದ ನಾನು ನಿಮಗೆ ಕನ್ನಡದಲ್ಲಿ ಉತ್ತರಿಸುತ್ತೇನೆ."
    return "Sure. I will use your preferred language from now on."


def language_summary_delta(language: str) -> str:
    if language == "kn":
        return "User prefers Kannada responses."
    return "User set a preferred response language."
