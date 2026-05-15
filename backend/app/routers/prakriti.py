"""Prakriti quiz router — AI quiz generation + history CRUD."""

from __future__ import annotations

import logging
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from openai import OpenAI
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.db.session import get_db
from app.models.prakriti import PrakritiResult
from app.services.auth import AuthUser, require_clerk_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/prakriti", tags=["prakriti"])

# ── Pydantic schemas ──────────────────────────────────────────────

class QuizOption(BaseModel):
    text: str
    dosha: str  # vata | pitta | kapha

class QuizQuestion(BaseModel):
    id: int
    category: str
    question: str
    options: list[QuizOption]

class GenerateQuizRequest(BaseModel):
    count: int = 12
    focus: str = "general"

class GenerateQuizResponse(BaseModel):
    questions: list[QuizQuestion]

class SaveResultRequest(BaseModel):
    mode: str = "classic"
    question_count: int
    prakriti_name: str
    primary_dosha: str
    secondary_dosha: str
    vata_pct: float
    pitta_pct: float
    kapha_pct: float
    answers_json: dict[str, Any] | None = None
    focus_area: str | None = None

class ResultResponse(BaseModel):
    id: str
    mode: str
    question_count: int
    prakriti_name: str
    primary_dosha: str
    secondary_dosha: str
    vata_pct: float
    pitta_pct: float
    kapha_pct: float
    answers_json: dict[str, Any] | None
    focus_area: str | None
    created_at: str

# ── AI Quiz Generation Agent ─────────────────────────────────────

SYSTEM_PROMPT = """You are an expert Ayurvedic Prakriti (constitution) analyst. Generate unique, insightful quiz questions that determine a person's dosha (Vata, Pitta, Kapha).

Go beyond basic physical traits. Include questions about:
- Emotional patterns, dream patterns, financial habits
- Creative vs analytical thinking, relationship behavior
- Seasonal preferences, recovery from illness, communication style
- Morning vs night energy, decision-making under pressure

Each question MUST have exactly 3 options — one per dosha (vata, pitta, kapha).
Shuffle the dosha order randomly for each question.

Respond ONLY with valid JSON:
{"questions": [{"id": <int>, "category": "<str>", "question": "<str>", "options": [{"text": "<str>", "dosha": "vata|pitta|kapha"}]}]}"""


@router.post("/generate-quiz", response_model=GenerateQuizResponse)
def generate_quiz(
    body: GenerateQuizRequest,
    _user: AuthUser = Depends(require_clerk_user),
):
    """Use OpenAI to generate dynamic Prakriti quiz questions."""
    api_key = settings.openai_api_key
    if not api_key:
        raise HTTPException(status_code=503, detail="OPENAI_API_KEY not configured")

    count = min(max(body.count, 5), 20)
    focus = body.focus or "general"

    user_prompt = (
        f"Generate {count} unique Ayurvedic Prakriti quiz questions"
        f"{f' focused on \"{focus}\" aspects' if focus != 'general' else ''}. "
        "Number them starting from 100. Make them specific and thoughtful."
    )

    try:
        client = OpenAI(api_key=api_key)
        resp = client.chat.completions.create(
            model=settings.openai_chat_model or "gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.9,
            max_tokens=3000,
        )
        content = resp.choices[0].message.content or ""
    except Exception as exc:
        logger.exception("OpenAI quiz generation failed")
        raise HTTPException(status_code=502, detail=f"AI error: {exc}") from exc

    # Parse JSON from response
    import json, re
    json_match = re.search(r"\{[\s\S]*\}", content)
    if not json_match:
        raise HTTPException(status_code=500, detail="Failed to parse AI response")

    try:
        parsed = json.loads(json_match.group())
        questions = parsed.get("questions", [])
        if not questions:
            raise ValueError("No questions in response")
        return GenerateQuizResponse(
            questions=[QuizQuestion(**q) for q in questions]
        )
    except Exception as exc:
        logger.exception("Quiz JSON parse error")
        raise HTTPException(status_code=500, detail=f"Parse error: {exc}") from exc


# ── History CRUD ──────────────────────────────────────────────────

@router.post("/results", response_model=ResultResponse)
def save_result(
    body: SaveResultRequest,
    user: AuthUser = Depends(require_clerk_user),
    db: Session = Depends(get_db),
):
    """Save a completed Prakriti quiz result."""
    result = PrakritiResult(
        clerk_user_id=user.clerk_user_id,
        mode=body.mode,
        question_count=body.question_count,
        prakriti_name=body.prakriti_name,
        primary_dosha=body.primary_dosha,
        secondary_dosha=body.secondary_dosha,
        vata_pct=body.vata_pct,
        pitta_pct=body.pitta_pct,
        kapha_pct=body.kapha_pct,
        answers_json=body.answers_json,
        focus_area=body.focus_area,
    )
    db.add(result)
    db.commit()
    db.refresh(result)
    return _to_response(result)


@router.get("/results", response_model=list[ResultResponse])
def list_results(
    user: AuthUser = Depends(require_clerk_user),
    db: Session = Depends(get_db),
):
    """List all Prakriti results for the authenticated user."""
    rows = (
        db.query(PrakritiResult)
        .filter(PrakritiResult.clerk_user_id == user.clerk_user_id)
        .order_by(PrakritiResult.created_at.desc())
        .limit(20)
        .all()
    )
    return [_to_response(r) for r in rows]


@router.get("/results/{result_id}", response_model=ResultResponse)
def get_result(
    result_id: str,
    user: AuthUser = Depends(require_clerk_user),
    db: Session = Depends(get_db),
):
    """Get a single Prakriti result by ID."""
    try:
        uid = uuid.UUID(result_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid result ID")

    result = db.query(PrakritiResult).filter(PrakritiResult.id == uid).first()
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")
    if result.clerk_user_id != user.clerk_user_id:
        raise HTTPException(status_code=403, detail="Not your result")
    return _to_response(result)


@router.delete("/results/{result_id}")
def delete_result(
    result_id: str,
    user: AuthUser = Depends(require_clerk_user),
    db: Session = Depends(get_db),
):
    """Delete a Prakriti result."""
    try:
        uid = uuid.UUID(result_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid result ID")

    result = db.query(PrakritiResult).filter(PrakritiResult.id == uid).first()
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")
    if result.clerk_user_id != user.clerk_user_id:
        raise HTTPException(status_code=403, detail="Not your result")
    db.delete(result)
    db.commit()
    return {"ok": True}


# ── Helpers ───────────────────────────────────────────────────────

def _to_response(r: PrakritiResult) -> ResultResponse:
    return ResultResponse(
        id=str(r.id),
        mode=r.mode,
        question_count=r.question_count,
        prakriti_name=r.prakriti_name,
        primary_dosha=r.primary_dosha,
        secondary_dosha=r.secondary_dosha,
        vata_pct=r.vata_pct,
        pitta_pct=r.pitta_pct,
        kapha_pct=r.kapha_pct,
        answers_json=r.answers_json,
        focus_area=r.focus_area,
        created_at=r.created_at.isoformat(),
    )
