from __future__ import annotations

import os
import unittest
from pathlib import Path
from unittest.mock import patch

from app.ingest.herb_formatter import herb_record_to_document
from app.memory import PostgresSummaryMemoryStore
from app.llm import client as llm_client
from app.llm.agent_base import has_required_prompt_sections
from app.llm.agents import (
    plant_image,
    prescription_document,
    prescription_intent,
    prescription_verify,
    rag_answer,
    session_query,
    unsplash_intent,
)
from app.llm.json_utils import parse_model_or_fallback
from app.llm.schemas import SessionQueryResult, UnsplashIntentResult
from app.routers import unsplash_intent as unsplash_router


ROOT = Path(__file__).resolve().parents[2]
BACKEND = ROOT / "backend"


class TestSeparateAgents(unittest.TestCase):
    def test_agent_prompts_have_required_sections(self) -> None:
        prompts = [
            session_query.PROMPT,
            rag_answer.PROMPT,
            plant_image.PROMPT,
            prescription_intent.PROMPT,
            prescription_document.PROMPT,
            prescription_verify.PROMPT,
            unsplash_intent.PROMPT,
        ]
        for prompt in prompts:
            self.assertTrue(has_required_prompt_sections(prompt), prompt[:80])

    def test_invalid_json_uses_schema_fallback(self) -> None:
        fallback = UnsplashIntentResult(show_images=False, keyword="")
        result = parse_model_or_fallback(UnsplashIntentResult, "not json", fallback)
        self.assertEqual(result, fallback)

    def test_session_query_falls_back_when_model_output_is_bad(self) -> None:
        with patch("app.llm.agents.session_query.complete_json", return_value="bad"):
            query, delta = session_query.run(
                [{"role": "user", "content": "tell me about tulsi"}],
                None,
                "tell me about tulsi",
            )
        self.assertEqual(query, "tell me about tulsi")
        self.assertEqual(delta, "")

    def test_session_query_schema_accepts_expected_shape(self) -> None:
        result = parse_model_or_fallback(
            SessionQueryResult,
            '{"retrieval_query": "amla benefits", "summary_delta": ""}',
            SessionQueryResult(),
        )
        self.assertEqual(result.retrieval_query, "amla benefits")

    def test_prescription_keywords_are_python_agent_logic(self) -> None:
        self.assertTrue(prescription_intent.keyword_match("Can I take this 5 mg tablet?"))
        self.assertFalse(prescription_intent.keyword_match("Tell me about tulsi leaves"))

    def test_herb_formatter_output(self) -> None:
        rendered = herb_record_to_document(
            {
                "name": "Tulsi",
                "link": "https://example.test/tulsi",
                "preview": "Aromatic herb.",
                "pacify": ["Kapha", "Vata"],
                "tridosha": False,
                "rasa": ["Katu", "Tikta"],
            }
        )
        self.assertIn("Herb name: Tulsi", rendered)
        self.assertIn("Pacifies (doshas): Kapha, Vata", rendered)
        self.assertIn("Balances all doshas (tridosha): False", rendered)
        self.assertIn("Rasa: Katu, Tikta", rendered)

    def test_postgres_memory_merges_summary_delta(self) -> None:
        class SessionLike:
            summary_text = "User likes concise answers."

        sess = SessionLike()
        result = PostgresSummaryMemoryStore().merge_summary_delta(
            sess, "User is testing the app."
        )
        self.assertIn("concise answers", result)
        self.assertIn("testing the app", result)

    def test_old_agent_files_are_gone(self) -> None:
        old_agent_dir = "age" + "nts"
        old_spec_dir = "agent" + "_specs"
        old_runtime = "agent" + "_runtime.py"
        old_renderer_dir = "context" + "_renderers"
        self.assertFalse((BACKEND / "app" / old_agent_dir).exists())
        self.assertFalse((BACKEND / "app" / old_spec_dir).exists())
        self.assertFalse((BACKEND / "app" / old_runtime).exists())
        self.assertFalse((BACKEND / "app" / old_renderer_dir).exists())

    def test_no_old_agent_imports_remain(self) -> None:
        banned = (
            "app." + "agents",
            "agent" + "_specs",
            "agent" + "_runtime",
            "context" + "_renderers",
        )
        for root, _, files in os.walk(BACKEND / "app"):
            for name in files:
                if name.endswith((".py", ".md")):
                    text = (Path(root) / name).read_text(encoding="utf-8", errors="ignore")
                    for needle in banned:
                        self.assertNotIn(needle, text, f"{needle} found in {name}")

    def test_env_examples_do_not_contain_secret_looking_values(self) -> None:
        for path in (ROOT / "fronteend-1" / ".env.local.example", BACKEND / ".env.example"):
            text = path.read_text(encoding="utf-8", errors="ignore").lower()
            self.assertNotIn("secret key:", text)
            self.assertNotIn("access key:", text)
            self.assertNotIn("s" + "k-", text)

    def test_openai_errors_become_value_errors(self) -> None:
        class BrokenCompletions:
            def create(self, **_: object) -> object:
                from openai import APIConnectionError

                raise APIConnectionError(request=None)

        class BrokenChat:
            completions = BrokenCompletions()

        class BrokenOpenAI:
            chat = BrokenChat()

        with patch.object(llm_client.settings, "openai_api_key", "test-key"):
            with patch.object(llm_client, "OpenAI", return_value=BrokenOpenAI()):
                with self.assertRaisesRegex(ValueError, "LLM request failed"):
                    llm_client.complete_chat(
                        model="test-model",
                        messages=[],
                        temperature=0,
                    )

    def test_unsplash_search_requires_access_key(self) -> None:
        with patch.object(unsplash_router.settings, "unsplash_access_key", ""):
            with self.assertRaisesRegex(Exception, "UNSPLASH_ACCESS_KEY"):
                unsplash_router.unsplash_search(
                    unsplash_router.UnsplashSearchRequest(keyword="tulsi")
                )


if __name__ == "__main__":
    unittest.main()
