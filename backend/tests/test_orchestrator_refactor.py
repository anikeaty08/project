from __future__ import annotations

import unittest
from types import SimpleNamespace

from fastapi import HTTPException

from app.services.auth import (
    AuthUser,
    hash_owner_token,
    new_owner_token,
    verify_owner_token,
    verify_session_user,
)
from app.services.chat_planner import ChatPlanner
from app.services.chat_verification import ChatVerificationService
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

    def test_clerk_session_user_allows_legacy_unowned_session(self) -> None:
        session = SimpleNamespace(clerk_user_id=None)
        user = AuthUser(clerk_user_id="user_123", claims={"sub": "user_123"})
        verify_session_user(session, user)


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

    def test_pdf_routes_to_document(self) -> None:
        self.assertEqual(
            UploadProcessingService().route_kind("application/pdf", "identify this"),
            "document",
        )

    def test_medicine_chat_needs_verification(self) -> None:
        self.assertTrue(ChatVerificationService().is_needed("Can I take this 81 mg tablet?"))

    def test_general_herb_chat_does_not_need_verification(self) -> None:
        self.assertFalse(ChatVerificationService().is_needed("Tell me about tulsi leaves"))


class TestOrchestrationServices(unittest.TestCase):
    def test_chat_planner_fast_path_for_first_turn(self) -> None:
        plan = ChatPlanner().build_plan(
            [{"role": "user", "content": "tell me about tulsi"}],
            None,
            "tell me about tulsi",
        )
        self.assertEqual(plan.query, "tell me about tulsi")
        self.assertEqual(plan.summary_delta, "")

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


if __name__ == "__main__":
    unittest.main()
