from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class PrakritiResult(Base):
    """Stores a completed Prakriti quiz result for a user."""

    __tablename__ = "prakriti_results"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    clerk_user_id: Mapped[str] = mapped_column(
        String(256), nullable=False, index=True
    )
    mode: Mapped[str] = mapped_column(
        String(32), nullable=False, default="classic"
    )  # "classic" | "ai-generated"
    question_count: Mapped[int] = mapped_column(Integer, nullable=False)
    prakriti_name: Mapped[str] = mapped_column(String(64), nullable=False)
    primary_dosha: Mapped[str] = mapped_column(String(16), nullable=False)
    secondary_dosha: Mapped[str] = mapped_column(String(16), nullable=False)
    vata_pct: Mapped[float] = mapped_column(Float, nullable=False)
    pitta_pct: Mapped[float] = mapped_column(Float, nullable=False)
    kapha_pct: Mapped[float] = mapped_column(Float, nullable=False)
    answers_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    focus_area: Mapped[str | None] = mapped_column(
        String(64), nullable=True
    )  # for AI-generated quizzes
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
