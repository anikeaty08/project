"""Unit tests for prescription document weak-parse heuristics."""

from __future__ import annotations

import unittest

from app.llm.tasks import is_parse_weak
from app.config import settings


class TestIsParseWeak(unittest.TestCase):
    def test_short_notes_and_short_query(self) -> None:
        min_c = settings.prescription_extraction_min_chars
        notes = "x" * max(0, min_c - 1)
        self.assertTrue(
            is_parse_weak(
                {
                    "raw_notes": notes,
                    "retrieval_query": "ab",
                    "confidence": 0.5,
                    "medications": [],
                }
            )
        )

    def test_confident_with_meds_not_weak(self) -> None:
        self.assertFalse(
            is_parse_weak(
                {
                    "raw_notes": "y" * (settings.prescription_extraction_min_chars + 5),
                    "retrieval_query": "aspirin 81 mg daily",
                    "confidence": 0.8,
                    "medications": [{"name": "aspirin"}],
                }
            )
        )

    def test_very_low_confidence_weak(self) -> None:
        self.assertTrue(
            is_parse_weak(
                {
                    "raw_notes": "something long enough " * 10,
                    "retrieval_query": "query long enough here " * 5,
                    "confidence": 0.2,
                    "medications": [],
                }
            )
        )


if __name__ == "__main__":
    unittest.main()
