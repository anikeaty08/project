from __future__ import annotations

import unittest
from types import SimpleNamespace

from fastapi import FastAPI
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.models.chat import ChatMessage, ChatSession
from app.models import session_upload  # noqa: F401
from app.routers import sessions as sessions_router
from app.services.auth import (
    AuthUser,
    hash_owner_token,
    new_owner_token,
    verify_owner_token,
    verify_session_user,
)
from app.services.chat_planner import ChatPlanner
from app.services.chat_repository import ChatRepository, session_title_from_message
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

    def test_clerk_session_user_rejects_legacy_unowned_session(self) -> None:
        session = SimpleNamespace(clerk_user_id=None)
        user = AuthUser(clerk_user_id="user_123", claims={"sub": "user_123"})
        with self.assertRaises(HTTPException) as ctx:
            verify_session_user(session, user)
        self.assertEqual(ctx.exception.status_code, 403)


class TestSessionRoutes(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine(
            "sqlite+pysqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.SessionLocal = sessionmaker(bind=self.engine)
        self.current_user = AuthUser(clerk_user_id="user_a", claims={"sub": "user_a"})
        self.app = FastAPI()
        self.app.include_router(sessions_router.router)

        def override_db():
            db = self.SessionLocal()
            try:
                yield db
            finally:
                db.close()

        def override_user():
            return self.current_user

        self.app.dependency_overrides[get_db] = override_db
        self.app.dependency_overrides[sessions_router.require_clerk_user] = override_user
        self.client = TestClient(self.app)

    def test_create_session_stores_clerk_user_and_default_title(self) -> None:
        response = self.client.post("/sessions/", json={})
        self.assertEqual(response.status_code, 200)
        session_id = response.json()["id"]
        self.assertEqual(response.json()["title"], "New chat")
        with self.SessionLocal() as db:
            row = db.get(ChatSession, session_id)
            self.assertIsNotNone(row)
            self.assertEqual(row.clerk_user_id, "user_a")
            self.assertEqual(row.title, "New chat")

    def test_list_sessions_returns_only_current_user_rows(self) -> None:
        with self.SessionLocal() as db:
            db.add(ChatSession(title="Mine", clerk_user_id="user_a"))
            db.add(ChatSession(title="Other", clerk_user_id="user_b"))
            db.commit()
        response = self.client.get("/sessions/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual([row["title"] for row in response.json()], ["Mine"])

    def test_messages_for_other_user_session_are_rejected(self) -> None:
        with self.SessionLocal() as db:
            other = ChatSession(title="Other", clerk_user_id="user_b")
            db.add(other)
            db.flush()
            db.add(ChatMessage(session_id=other.id, role="user", content="private"))
            db.commit()
            other_id = str(other.id)
        response = self.client.get(f"/sessions/{other_id}/messages")
        self.assertEqual(response.status_code, 403)

    def test_message_query_joins_session_owner(self) -> None:
        with self.SessionLocal() as db:
            mine = ChatSession(title="Mine", clerk_user_id="user_a")
            other = ChatSession(title="Other", clerk_user_id="user_b")
            db.add_all([mine, other])
            db.flush()
            db.add(ChatMessage(session_id=mine.id, role="user", content="mine"))
            db.add(ChatMessage(session_id=other.id, role="user", content="other"))
            db.commit()
            mine_id = str(mine.id)
        response = self.client.get(f"/sessions/{mine_id}/messages")
        self.assertEqual(response.status_code, 200)
        self.assertEqual([row["content"] for row in response.json()], ["mine"])


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
