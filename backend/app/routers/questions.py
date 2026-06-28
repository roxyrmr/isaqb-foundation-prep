from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..database import get_db
from ..models import Chapter, Choice, Question
from ..schemas import ChapterOut, QuestionOut, ChoiceOut
from .constants import CPSA_F_WEIGHTS, EXAM_DEFAULT_COUNT, EXAM_MAX_COUNT, EXAM_MIN_COUNT

router = APIRouter(prefix="/questions", tags=["questions"])


@router.get("/chapters", response_model=list[ChapterOut])
def list_chapters(db: Session = Depends(get_db)):
    chapters = db.query(Chapter).all()
    result = []
    for ch in chapters:
        count = db.query(func.count(Question.id)).filter(Question.chapter_id == ch.id).scalar()
        out = ChapterOut.model_validate(ch)
        out.question_count = count or 0
        out.exam_weight = CPSA_F_WEIGHTS.get(ch.learning_goal_code, 0.0)
        result.append(out)
    return result


@router.get("/exam-config")
def exam_config():
    return {
        "min_count": EXAM_MIN_COUNT,
        "max_count": EXAM_MAX_COUNT,
        "default_count": EXAM_DEFAULT_COUNT,
        "weights": CPSA_F_WEIGHTS,
    }


@router.get("", response_model=list[QuestionOut])
def list_questions(
    chapter_ids: list[int] = Query(default=[]),
    q_type: str | None = Query(default=None),
    version: str | None = Query(default=None),
    lang: str = Query(default="de"),
    db: Session = Depends(get_db),
):
    qs = db.query(Question)
    if chapter_ids:
        qs = qs.filter(Question.chapter_id.in_(chapter_ids))
    if q_type:
        qs = qs.filter(Question.type == q_type)
    if version:
        qs = qs.filter(Question.version == version)
    questions = qs.all()
    return [_question_out(q, reveal_answers=False, lang=lang) for q in questions]


@router.get("/{question_id}", response_model=QuestionOut)
def get_question(
    question_id: str,
    reveal: bool = False,
    lang: str = Query(default="de"),
    db: Session = Depends(get_db),
):
    q = db.query(Question).filter(Question.id == question_id).first()
    if q is None:
        from fastapi import HTTPException
        raise HTTPException(404, "Question not found")
    return _question_out(q, reveal_answers=reveal, lang=lang)


def _resolve_text(primary: str | None, english: str | None, lang: str) -> str:
    """Return the best text for the requested language.
    For 'en': prefer text_en, fall back to primary.
    For 'de': prefer primary only when it differs from text_en (real German translation);
              otherwise fall back to text_en so English-only questions stay readable.
    """
    if lang == "en":
        return english or primary or ""
    # DE: use primary if it's genuinely different from English, else fall back to English
    if primary and english and primary != english:
        return primary
    return primary or english or ""


def _resolve_label(primary: str | None, english: str | None, lang: str) -> str | None:
    if primary is None and english is None:
        return None
    return _resolve_text(primary, english, lang) or None


def _question_out(q: Question, reveal_answers: bool, lang: str = "de") -> QuestionOut:
    choices = [
        ChoiceOut(
            id=c.id,
            text=_resolve_text(c.text, c.text_en, lang),
            display_order=c.display_order,
            is_correct=c.is_correct if reveal_answers else None,
            category_label=(
                _resolve_label(c.category_label, c.category_label_en, lang)
                if reveal_answers else None
            ),
            explanation=c.explanation if reveal_answers else None,
        )
        for c in sorted(q.choices, key=lambda c: c.display_order)
    ]

    categories: list[str] = []
    if q.type == "category":
        seen: set[str] = set()
        for c in q.choices:
            label = _resolve_label(c.category_label, c.category_label_en, lang)
            if label and label not in seen:
                seen.add(label)
                categories.append(label)

    return QuestionOut(
        id=q.id,
        type=q.type,
        text=_resolve_text(q.text, q.text_en, lang),
        chapter_id=q.chapter_id,
        difficulty=q.difficulty,
        version=q.version,
        choices=choices,
        explanation=q.explanation if reveal_answers else None,
        correct_count=sum(1 for c in q.choices if c.is_correct),
        categories=categories,
    )
