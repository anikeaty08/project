from __future__ import annotations

import tempfile
import unittest
import uuid
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from app.llm.agents import plant_image
from app.services import chat_turn
from app.services import prescription_upload_service as upload_service


class FakeDb:
    def __init__(self) -> None:
        self.added = None

    def get(self, *_: object) -> object:
        return SimpleNamespace(id=uuid.uuid4())

    def scalar(self, *_: object) -> int:
        return 0

    def add(self, row: object) -> None:
        self.added = row

    def commit(self) -> None:
        pass

    def refresh(self, row: object) -> None:
        if getattr(row, "created_at", None) is None:
            row.created_at = None


class TestPlantUploadRouting(unittest.TestCase):
    def test_plant_style_image_uses_plant_vision_agent(self) -> None:
        plant_parse = {
            "likely_name": "Saffron",
            "botanical_name": "Crocus sativus",
            "confidence": 0.74,
            "visual_evidence": ["purple flower", "red stigmas"],
            "uncertainty": "Flower-only image; confirm with leaves/corm.",
            "retrieval_query": "Saffron Crocus sativus",
            "flat_text": "Plant image identification upload:\nLikely plant: Saffron",
            "provenance": "plant_vision",
        }
        with tempfile.TemporaryDirectory() as td:
            with patch.object(upload_service.settings, "upload_dir", Path(td)):
                with patch.object(upload_service, "_upsert_upload_to_chroma"):
                    with patch.object(
                        upload_service,
                        "is_prescription_keyword_match",
                        return_value=False,
                    ) as intent:
                        with patch.object(
                            upload_service,
                            "run_plant_image_agent",
                            return_value=plant_parse,
                        ) as plant_agent:
                            with patch.object(
                                upload_service, "run_prescription_document_agent"
                            ) as prescription_agent:
                                row = upload_service.save_and_process_upload(
                                    FakeDb(),
                                    uuid.uuid4(),
                                    "saffron2.jpg",
                                    "image/jpeg",
                                    b"fake-image",
                                    user_context="yeh konsi plant hain",
                                )

        intent.assert_called_once()
        plant_agent.assert_called_once()
        prescription_agent.assert_not_called()
        self.assertEqual(row.parse_result_json["likely_name"], "Saffron")
        self.assertEqual(row.parse_result_json["provenance"], "plant_vision")

    def test_prescription_style_image_keeps_prescription_parser(self) -> None:
        prescription_parse = {
            "medications": [{"name": "aspirin"}],
            "raw_notes": "aspirin 81 mg daily",
            "confidence": 0.8,
            "retrieval_query": "aspirin 81 mg daily",
            "flat_text": "Prescription / document upload:\nMedication: aspirin",
        }
        with tempfile.TemporaryDirectory() as td:
            with patch.object(upload_service.settings, "upload_dir", Path(td)):
                with patch.object(upload_service, "_upsert_upload_to_chroma"):
                    with patch.object(
                        upload_service,
                        "is_prescription_keyword_match",
                        return_value=True,
                    ):
                        with patch.object(
                            upload_service,
                            "run_prescription_document_agent",
                            return_value=prescription_parse,
                        ) as prescription_agent:
                            with patch.object(
                                upload_service, "run_plant_image_agent"
                            ) as plant_agent:
                                row = upload_service.save_and_process_upload(
                                    FakeDb(),
                                    uuid.uuid4(),
                                    "rx.jpg",
                                    "image/jpeg",
                                    b"fake-image",
                                    user_context="Can I take this 81 mg tablet?",
                                )

        prescription_agent.assert_called_once()
        plant_agent.assert_not_called()
        self.assertIn("medications", row.parse_result_json)

    def test_plant_vision_output_is_in_upload_supplement(self) -> None:
        row = SimpleNamespace(
            original_filename="saffron2.jpg",
            parse_result_json={
                "flat_text": "Plant image identification upload:\nLikely plant: Saffron\nBotanical name: Crocus sativus",
            },
            verify_result_json=None,
        )
        supplement = chat_turn._upload_supplement_text([row])
        self.assertIn("Plant image identification upload", supplement)
        self.assertIn("Likely plant: Saffron", supplement)


class TestFastRetrievalPlanning(unittest.TestCase):
    def test_simple_first_turn_skips_session_query_agent(self) -> None:
        self.assertFalse(
            chat_turn.should_plan_retrieval_query(
                [{"role": "user", "content": "tell me about tulsi"}],
                None,
                "tell me about tulsi",
            )
        )

    def test_pronoun_followup_uses_session_query_agent(self) -> None:
        self.assertTrue(
            chat_turn.should_plan_retrieval_query(
                [
                    {"role": "user", "content": "tell me about tulsi"},
                    {"role": "assistant", "content": "Tulsi is holy basil."},
                    {"role": "user", "content": "what are its benefits?"},
                ],
                None,
                "what are its benefits?",
            )
        )


class TestPlantImageAgentSmoke(unittest.TestCase):
    def test_mocked_saffron_image_response_normalizes_identification(self) -> None:
        image_path = (
            Path(__file__).resolve().parents[1]
            / "uploads"
            / "a7d37c19-d189-433c-a93c-23c2ad00e43c"
            / "4b25242a-235a-4017-abf0-b622209fa2fa"
            / "saffron2.jpg"
        )
        image_bytes = image_path.read_bytes() if image_path.exists() else b"fake-image"
        raw = """
        {
          "likely_name": "Saffron",
          "botanical_name": "Crocus sativus",
          "confidence": 0.78,
          "visual_evidence": ["purple crocus-like flower", "red stigma threads"],
          "uncertainty": "Confirm with full plant view.",
          "retrieval_query": "Saffron Crocus sativus",
          "raw_notes": "Likely saffron flower."
        }
        """
        with patch.object(plant_image.settings, "openai_api_key", "test-key"):
            with patch.object(plant_image, "complete_json", return_value=raw):
                parsed = plant_image.run(
                    "saffron2.jpg",
                    "image/jpeg",
                    image_bytes,
                    "yeh konsi plant hain",
                )
        self.assertEqual(parsed["likely_name"], "Saffron")
        self.assertEqual(parsed["botanical_name"], "Crocus sativus")
        self.assertIn("Plant image identification upload", parsed["flat_text"])


if __name__ == "__main__":
    unittest.main()
