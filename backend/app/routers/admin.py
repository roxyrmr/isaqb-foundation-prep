# NOT ACTIVE IN PRODUCTION.
# Admin endpoints for question CRUD — only useful when running the backend locally.
# To add/edit questions for the static site, edit bundled_questions.py and run `make generate`.

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Chapter, Choice, Question
from ..schemas import ChapterOut, QuestionWithChoicesCreate
from ..services.seeder import seed_bundled, seed_from_github

router = APIRouter(prefix="/admin", tags=["admin"])

PASS_THRESHOLD = 0.75


@router.post("/seed")
async def seed_questions(version: str = "current", db: Session = Depends(get_db)):
    bundled = seed_bundled(db)
    try:
        github = await seed_from_github(db, version=version)
    except Exception as e:
        github = {"seeded": 0, "skipped": 0, "errors": [f"GitHub fetch failed: {e}"]}
    return {
        "seeded": bundled["seeded"] + github["seeded"],
        "skipped": bundled["skipped"] + github["skipped"],
        "errors": bundled["errors"] + github["errors"],
    }


@router.post("/questions")
def create_question(payload: QuestionWithChoicesCreate, db: Session = Depends(get_db)):
    existing = db.query(Question).filter(Question.id == payload.question.id).first()
    if existing:
        raise HTTPException(409, f"Question ID '{payload.question.id}' already exists")

    q = Question(
        id=payload.question.id,
        chapter_id=payload.question.chapter_id,
        type=payload.question.type,
        text=payload.question.text,
        explanation=payload.question.explanation,
        difficulty=payload.question.difficulty,
        version=payload.question.version,
        is_manual=True,
    )
    db.add(q)
    db.flush()

    for i, c in enumerate(payload.choices):
        choice = Choice(
            question_id=q.id,
            text=c.text,
            is_correct=c.is_correct,
            category_label=c.category_label,
            explanation=c.explanation,
            display_order=c.display_order if c.display_order else i,
        )
        db.add(choice)

    db.commit()
    return {"id": q.id, "status": "created"}


@router.delete("/questions/{question_id}")
def delete_question(question_id: str, db: Session = Depends(get_db)):
    q = db.query(Question).filter(Question.id == question_id).first()
    if not q:
        raise HTTPException(404, "Question not found")
    db.delete(q)
    db.commit()
    return {"status": "deleted"}


@router.patch("/questions/{question_id}")
def update_question(
    question_id: str,
    payload: dict,
    db: Session = Depends(get_db),
):
    q = db.query(Question).filter(Question.id == question_id).first()
    if not q:
        raise HTTPException(404, "Question not found")
    allowed = {"text", "explanation", "difficulty", "chapter_id", "version"}
    for key, val in payload.items():
        if key in allowed:
            setattr(q, key, val)
    db.commit()
    return {"status": "updated"}


@router.post("/chapters")
def create_chapter(name: str, learning_goal_code: str, description: str = "", db: Session = Depends(get_db)):
    existing = db.query(Chapter).filter(Chapter.learning_goal_code == learning_goal_code).first()
    if existing:
        raise HTTPException(409, "Chapter with this LG code already exists")
    ch = Chapter(name=name, learning_goal_code=learning_goal_code, description=description or None)
    db.add(ch)
    db.commit()
    db.refresh(ch)
    return ChapterOut.model_validate(ch)
