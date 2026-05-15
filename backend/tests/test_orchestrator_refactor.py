from __future__ import annotations

import unittest
import uuid
from types import SimpleNamespace
from unittest.mock import patch

from fastapi import HTTPException
from sqlalchemy.dialects import postgresql

from app.services.auth import (
    AuthUser,
    hash_owner_token,
    new_owner_token,
    verify_owner_token,
    verify_session_user,
)
from app.services.answer_service import ensure_citation
from app.services.chat_planner import ChatPlanner
from app.services.chat_agent_graph import ChatAgentGraph
from app.services.chat_repository import ChatRepository, session_title_from_message
from app.services.chat_verification import ChatVerificationService
from app.services.chat_models import UploadContext
from app.services.language_preferences import requested_language
from app.services.topic_guard import classify_ayurveda_topic, is_ayurveda_related, off_topic_response
from app.services.upload_context import UploadContextService
from app.services.upload_processing import UploadProcessingService


class TestOwnershipHelpers(unittest.TestCase):
    def test_owner_token_accepts_matching_token(self) -> None:
        token = new_owner_token()
        session = SimpleNamespace(owner_token_hash=hash_owner_token(token))
        verify_owner_token(session, token)

    def test_owner_token_rejects_missing_token(self) -> None:
        session = SimpleNamespace(owner_token_hash=hash_owner_token("secret"))
        with self.assertRaises(HTTPException) as ctx:
            verify_owner_token(session, None)
        self.assertEqual(ctx.exception.status_code, 403)

    def test_legacy_session_without_token_allows_access(self) -> None:
        session = SimpleNamespace(owner_token_hash=None)
        verify_owner_token(session, None)

    def test_clerk_session_user_accepts_owner(self) -> None:
        session = SimpleNamespace(clerk_user_id="user_123")
        user = AuthUser(clerk_user_id="user_123", claims={"sub": "user_123"})
        verify_session_user(session, user)

    def test_clerk_session_user_rejects_other_user(self) -> None:
        session = SimpleNamespace(clerk_user_id="user_123")
        user = AuthUser(clerk_user_id="user_456", claims={"sub": "user_456"})
        with self.assertRaises(HTTPException) as ctx:
            verify_session_user(session, user)
        self.assertEqual(ctx.exception.status_code, 403)

    def test_clerk_session_user_rejects_legacy_unowned_session(self) -> None:
        session = SimpleNamespace(clerk_user_id=None)
        user = AuthUser(clerk_user_id="user_123", claims={"sub": "user_123"})
        with self.assertRaises(HTTPException) as ctx:
            verify_session_user(session, user)
        self.assertEqual(ctx.exception.status_code, 403)


class TestDeterministicRouting(unittest.TestCase):
    def test_image_non_medicine_routes_to_plant(self) -> None:
        self.assertEqual(
            UploadProcessingService().route_kind("image/jpeg", "yeh konsi plant hain"),
            "plant_image",
        )

    def test_image_medicine_routes_to_document(self) -> None:
        self.assertEqual(
            UploadProcessingService().route_kind("image/jpeg", "Can I take this 81 mg tablet?"),
            "document",
        )

    def test_generic_image_identification_routes_to_plant(self) -> None:
        self.assertEqual(
            UploadProcessingService().route_kind("image/jpeg", "identify this image"),
            "plant_image",
        )

    def test_prescription_filename_routes_image_to_document(self) -> None:
        self.assertEqual(
            UploadProcessingService().route_kind(
                "image/jpeg",
                "Please help me with the attached file(s).",
                "rx-81mg-tablet.jpg",
            ),
            "document",
        )

    def test_pdf_routes_to_document(self) -> None:
        self.assertEqual(
            UploadProcessingService().route_kind("application/pdf", "identify this"),
            "document",
        )

    def test_medicine_chat_needs_verification(self) -> None:
        self.assertTrue(ChatVerificationService().is_needed("Can I take this 81 mg tablet?"))

    def test_general_herb_chat_does_not_need_verification(self) -> None:
        self.assertFalse(ChatVerificationService().is_needed("Tell me about tulsi leaves"))

    def test_prescription_upload_context_needs_verification(self) -> None:
        supplement = (
            "USER_UPLOAD rx.pdf:\n"
            "Prescription / document upload:\n"
            "Medication: aspirin | 81 mg | daily"
        )
        self.assertTrue(ChatVerificationService().is_needed("please explain this", supplement))


class TestOrchestrationServices(unittest.TestCase):
    def test_session_title_uses_first_message(self) -> None:
        title = session_title_from_message("  yeh konsi plant hai please identify this leaf image  ")
        self.assertEqual(title, "yeh konsi plant hai please identify this leaf image")

    def test_session_title_is_shortened_cleanly(self) -> None:
        title = session_title_from_message("Tell me about ashwagandha dosage safety interactions and precautions for sleep")
        self.assertLessEqual(len(title), 64)
        self.assertFalse(title.endswith(" "))

    def test_session_title_for_upload_only_prompt(self) -> None:
        title = session_title_from_message("Please help me with the attached file(s).")
        self.assertEqual(title, "Uploaded file")

    def test_repository_updates_new_chat_title_from_first_message(self) -> None:
        session = SimpleNamespace(title="New chat", updated_at=None)
        ChatRepository().set_initial_title(session, "  tell me about tulsi benefits  ")
        self.assertEqual(session.title, "tell me about tulsi benefits")

    def test_owned_message_query_is_scoped_by_session_owner(self) -> None:
        stmt = ChatRepository().owned_messages_statement(uuid.uuid4(), "user_123")
        sql = str(stmt.compile(dialect=postgresql.dialect()))
        self.assertIn("JOIN chat_sessions", sql)
        self.assertIn("chat_sessions.clerk_user_id", sql)
        self.assertIn("chat_messages.session_id", sql)

    def test_chat_planner_fast_path_for_first_turn(self) -> None:
        plan = ChatPlanner().build_plan(
            [{"role": "user", "content": "tell me about tulsi"}],
            None,
            "tell me about tulsi",
        )
        self.assertEqual(plan.query, "tell me about tulsi")
        self.assertEqual(plan.summary_delta, "")

    def test_agent_graph_keeps_simple_turn_on_fast_path(self) -> None:
        graph = ChatAgentGraph()
        ctx = UploadContext(secondary_query=None, supplement_text=None, pending_notes=[])
        self.assertFalse(graph._is_complex_turn("tell me about tulsi", ctx))

    def test_agent_graph_routes_complex_turn_to_bounded_loop(self) -> None:
        graph = ChatAgentGraph()
        ctx = UploadContext(secondary_query=None, supplement_text=None, pending_notes=[])
        self.assertTrue(
            graph._is_complex_turn(
                "Compare tulsi and ashwagandha for stress and safety",
                ctx,
            )
        )

    def test_topic_guard_rejects_non_ayurveda_question(self) -> None:
        self.assertFalse(is_ayurveda_related("write me a python sorting algorithm"))
        self.assertIn("Ayurveda", off_topic_response())

    def test_topic_guard_rejects_clearly_unrelated_questions(self) -> None:
        self.assertFalse(is_ayurveda_related("make a movie script"))
        self.assertFalse(is_ayurveda_related("what is the capital of france"))

    def test_topic_guard_allows_herb_question(self) -> None:
        self.assertTrue(is_ayurveda_related("tell me about tulsi benefits"))

    def test_topic_guard_allows_common_herb_typo(self) -> None:
        self.assertTrue(is_ayurveda_related("Mujhe ashvgandha ke bare mein batao"))

    def test_topic_guard_allows_dosha_questionnaire_reply(self) -> None:
        self.assertTrue(is_ayurveda_related("thin, dry, high, calm, cancer"))

    def test_topic_guard_allows_contextual_dosha_questionnaire_reply(self) -> None:
        messages = [
            {
                "role": "assistant",
                "content": (
                    "Please share your body type, skin type, energy levels, "
                    "temperament, and any health concerns for dosha analysis."
                ),
            }
        ]
        self.assertEqual(
            classify_ayurveda_topic("thin, dry, high, calm, cancer", recent_messages=messages),
            "allowed",
        )
        self.assertEqual(
            classify_ayurveda_topic("cancer", recent_messages=messages),
            "contextual",
        )

    def test_topic_guard_allows_short_contextual_followups_after_ayurveda(self) -> None:
        messages = [
            {
                "role": "assistant",
                "content": "Tulsi is an Ayurvedic herb often discussed for respiratory wellness.",
            }
        ]
        self.assertEqual(classify_ayurveda_topic("yes", recent_messages=messages), "contextual")
        self.assertEqual(classify_ayurveda_topic("continue", recent_messages=messages), "contextual")
        self.assertEqual(classify_ayurveda_topic("tell me more", recent_messages=messages), "contextual")

    def test_topic_guard_allows_kannada_language_preference(self) -> None:
        self.assertEqual(classify_ayurveda_topic("talk to me in kannada"), "contextual")
        self.assertEqual(requested_language("talk to me in kannada"), "kn")

    def test_agent_graph_routes_language_preference_to_direct_answer(self) -> None:
        graph = ChatAgentGraph()
        state = {
            "user_content": "talk to me in kannada",
            "uploads": [],
            "trimmed_messages": [{"role": "user", "content": "talk to me in kannada"}],
        }
        updated = graph._save_user_message.__func__(graph, state) if False else state
        updated["off_topic"] = False
        updated["direct_answer"] = "ಖಂಡಿತ. ಇಂದಿನಿಂದ ನಾನು ನಿಮಗೆ ಕನ್ನಡದಲ್ಲಿ ಉತ್ತರಿಸುತ್ತೇನೆ."
        updated["direct_summary_delta"] = "User prefers Kannada responses."
        self.assertEqual(graph._route_after_user_message(updated), "direct")

    def test_topic_guard_blocks_unrelated_requests_even_after_ayurveda_context(self) -> None:
        messages = [
            {
                "role": "assistant",
                "content": "Tulsi is an Ayurvedic herb often discussed for respiratory wellness.",
            }
        ]
        self.assertEqual(classify_ayurveda_topic("write me python code", recent_messages=messages), "blocked")
        self.assertEqual(classify_ayurveda_topic("make a movie script", recent_messages=messages), "blocked")

    def test_off_topic_response_is_warm_and_actionable(self) -> None:
        response = off_topic_response()
        self.assertIn("focused on Ayurveda", response)
        self.assertIn("You can ask", response)
        self.assertIn("What is my dosha", response)

    def test_answer_service_adds_fallback_citation(self) -> None:
        answer = ensure_citation(
            "Tulsi supports respiratory wellness.",
            "--- Source [1] book ---\nTulsi text",
        )
        self.assertTrue(answer.endswith("Source: [1]"))

    def test_upload_context_reports_pending_upload(self) -> None:
        upload = SimpleNamespace(
            id="u1",
            session_id="s1",
            original_filename="leaf.jpg",
            mime_type="image/jpeg",
            status="queued",
            parse_result_json=None,
            verify_result_json=None,
        )
        ctx = UploadContextService().build_context([upload])
        self.assertIn("still queued", ctx.supplement_text)
        self.assertEqual(ctx.secondary_query, None)

    def test_upload_context_uses_completed_parse(self) -> None:
        upload = SimpleNamespace(
            id="u1",
            session_id="s1",
            original_filename="leaf.jpg",
            mime_type="image/jpeg",
            status="completed",
            parse_result_json={
                "retrieval_query": "Tulsi Ocimum tenuiflorum",
                "flat_text": "Plant image identification upload:\nLikely plant: Tulsi",
            },
            verify_result_json=None,
        )
        ctx = UploadContextService().build_context([upload])
        self.assertIn("Tulsi", ctx.secondary_query)
        self.assertIn("Plant image identification upload", ctx.supplement_text)

    def test_agent_graph_finishes_pending_upload_before_rag_context(self) -> None:
        graph = ChatAgentGraph()
        upload = SimpleNamespace(
            status="queued",
            parse_result_json=None,
        )
        completed = SimpleNamespace(
            status="completed",
            parse_result_json={
                "retrieval_query": "Tulsi Ocimum tenuiflorum",
                "flat_text": "Plant image identification upload:\nLikely plant: Tulsi",
            },
        )
        with patch(
            "app.services.chat_agent_graph.process_existing_upload",
            return_value=completed,
        ) as process:
            ready = graph._ensure_uploads_ready(SimpleNamespace(), [upload], "identify this image")

        process.assert_called_once()
        self.assertEqual(ready[0].status, "completed")


if __name__ == "__main__":
    unittest.main()
