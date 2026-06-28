# NOT ACTIVE IN PRODUCTION.
# The static frontend (GitHub Pages) runs all exam logic in engine.ts and never calls this router.
# This router is preserved for a future server-backed deployment that would add:
#   - persistent attempt history across sessions
#   - cross-device continuity
#   - user identity and leaderboards
# To activate: wire up frontend/src/api/client.ts (currently deleted) and replace engine.ts calls.

import random
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Answer, Attempt, Chapter, Choice, Question
from ..schemas import (
    AnswerFeedback,
    ExamResults,
    QuestionOut,
    QuestionResult,
    StartExamRequest,
    StartExamResponse,
    SubmitAnswerRequest,
    ChoiceOut,
)
from ..services.scoring import score_category_question, score_pick_question
from ..services.shuffle import make_seed, shuffled
from .constants import CPSA_F_WEIGHTS, EXAM_DEFAULT_COUNT, EXAM_MAX_COUNT, EXAM_MIN_COUNT
from .questions import _question_out, _resolve_label, _resolve_text

router = APIRouter(prefix="/exam", tags=["exam"])

PASS_THRESHOLD = 0.75


@router.post("/start", response_model=StartExamResponse)
def start_exam(req: StartExamRequest, db: Session = Depends(get_db)):
    attempt_id = str(uuid.uuid4())
    seed_val = make_seed(attempt_id, "order")

    if req.question_ids is not None:
        # Retake: exact question set in the original order, no re-sampling
        id_set = {qid: i for i, qid in enumerate(req.question_ids)}
        rows = db.query(Question).filter(Question.id.in_(req.question_ids)).all()
        questions = sorted(rows, key=lambda q: id_set.get(q.id, 0))
    elif req.mode == "exam":
        rng = random.Random(seed_val)
        total = req.count if req.count else rng.randint(EXAM_MIN_COUNT, EXAM_MAX_COUNT)
        total = max(EXAM_MIN_COUNT, min(EXAM_MAX_COUNT, total))
        questions = _weighted_exam_sample(db, total, seed_val)
        questions = shuffled(questions, seed_val)
    else:
        # Study mode: user picks chapters freely
        qs = db.query(Question)
        if req.chapter_ids:
            qs = qs.filter(Question.chapter_id.in_(req.chapter_ids))
        questions = qs.all()
        if req.shuffle:
            questions = shuffled(questions, seed_val)
        if req.count and req.count < len(questions):
            questions = questions[: req.count]

    if not questions:
        raise HTTPException(404, "No questions found for the given filters")

    question_order = [q.id for q in questions]

    attempt = Attempt(
        id=attempt_id,
        started_at=datetime.now(timezone.utc),
        mode=req.mode,
        config={
            "chapter_ids": req.chapter_ids,
            "count": req.count,
            "shuffle": req.shuffle,
            "weighted": req.mode == "exam",
        },
        question_order=question_order,
        shuffle_seed=str(seed_val),
        username=req.username,
    )
    db.add(attempt)
    db.commit()

    return StartExamResponse(
        attempt_id=attempt_id,
        total_questions=len(question_order),
        mode=req.mode,
    )


@router.get("/{attempt_id}/question/{index}", response_model=QuestionOut)
def get_question_at(
    attempt_id: str,
    index: int,
    lang: str = Query(default="de"),
    db: Session = Depends(get_db),
):
    attempt = _get_attempt(attempt_id, db)
    if index < 0 or index >= len(attempt.question_order):
        raise HTTPException(400, f"Index {index} out of range")

    qid = attempt.question_order[index]
    q = db.query(Question).filter(Question.id == qid).first()
    if q is None:
        raise HTTPException(404, "Question not found in DB")

    seed = make_seed(attempt_id, qid)
    q_out = _question_out(q, reveal_answers=False, lang=lang)
    q_out.choices = shuffled(q_out.choices, seed)
    return q_out


@router.post("/{attempt_id}/answer", response_model=AnswerFeedback)
def submit_answer(
    attempt_id: str,
    req: SubmitAnswerRequest,
    lang: str = Query(default="de"),
    db: Session = Depends(get_db),
):
    attempt = _get_attempt(attempt_id, db)
    if attempt.finished_at is not None:
        raise HTTPException(400, "Exam already finished")
    if req.question_id not in attempt.question_order:
        raise HTTPException(400, "Question not part of this attempt")

    q = db.query(Question).filter(Question.id == req.question_id).first()
    if q is None:
        raise HTTPException(404, "Question not found")

    result = _compute_score(q, req.selected)

    existing = (
        db.query(Answer)
        .filter(Answer.attempt_id == attempt_id, Answer.question_id == req.question_id)
        .first()
    )
    if existing:
        existing.selected = req.selected if not isinstance(req.selected, dict) else req.selected
        existing.score = result.score
        existing.max_score = result.max_score
        existing.time_spent_s = req.time_spent_s
    else:
        answer = Answer(
            attempt_id=attempt_id,
            question_id=req.question_id,
            selected=req.selected if not isinstance(req.selected, dict) else req.selected,
            score=result.score,
            max_score=result.max_score,
            time_spent_s=req.time_spent_s,
        )
        db.add(answer)
    db.commit()

    reveal = attempt.mode == "study"
    choices_out: Optional[list[ChoiceOut]] = None
    if reveal:
        choices_out = [
            ChoiceOut(
                id=c.id,
                text=_resolve_text(c.text, c.text_en, lang),
                display_order=c.display_order,
                is_correct=c.is_correct,
                category_label=_resolve_label(c.category_label, c.category_label_en, lang),
                explanation=c.explanation,
            )
            for c in sorted(q.choices, key=lambda c: c.display_order)
        ]

    return AnswerFeedback(
        question_id=req.question_id,
        score=result.score,
        max_score=result.max_score,
        correct_count=result.correct_count,
        wrong_count=result.wrong_count,
        is_overselected=result.is_overselected,
        choices=choices_out,
    )


@router.post("/{attempt_id}/finish", response_model=ExamResults)
def finish_exam(
    attempt_id: str,
    lang: str = Query(default="de"),
    db: Session = Depends(get_db),
):
    attempt = _get_attempt(attempt_id, db)
    if attempt.finished_at is None:
        attempt.finished_at = datetime.now(timezone.utc)
        db.commit()
    return _build_results(attempt, db, lang=lang)


@router.get("/{attempt_id}/results", response_model=ExamResults)
def get_results(
    attempt_id: str,
    lang: str = Query(default="de"),
    db: Session = Depends(get_db),
):
    attempt = _get_attempt(attempt_id, db)
    if attempt.finished_at is None:
        raise HTTPException(400, "Exam not yet finished. POST /finish first.")
    return _build_results(attempt, db, lang=lang)


# ── helpers ──────────────────────────────────────────────────────────────────

def _weighted_exam_sample(db: Session, total: int, seed: int) -> list[Question]:
    """
    Sample `total` questions using CPSA-F curriculum weights.
    Each chapter contributes proportionally; shortfalls are filled from the
    overflow pool (questions not yet selected from any chapter).
    """
    rng = random.Random(seed)

    chapters = db.query(Chapter).all()
    lg_to_id = {ch.learning_goal_code: ch.id for ch in chapters}

    selected: list[Question] = []
    overflow: list[Question] = []

    for lg_code, weight in CPSA_F_WEIGHTS.items():
        ch_id = lg_to_id.get(lg_code)
        if ch_id is None:
            continue
        pool = db.query(Question).filter(Question.chapter_id == ch_id).all()
        target = round(weight * total)

        if len(pool) <= target:
            # Take everything available from this chapter
            selected.extend(pool)
        else:
            chosen = rng.sample(pool, target)
            chosen_ids = {q.id for q in chosen}
            selected.extend(chosen)
            overflow.extend(q for q in pool if q.id not in chosen_ids)

    # LG-GEN questions go straight to overflow
    gen_id = lg_to_id.get("LG-GEN")
    if gen_id:
        overflow.extend(db.query(Question).filter(Question.chapter_id == gen_id).all())

    # Fill remaining slots from the overflow pool
    deficit = total - len(selected)
    if deficit > 0 and overflow:
        fill = rng.sample(overflow, min(deficit, len(overflow)))
        selected.extend(fill)

    return selected[:total]


def _get_attempt(attempt_id: str, db: Session) -> Attempt:
    attempt = db.query(Attempt).filter(Attempt.id == attempt_id).first()
    if not attempt:
        raise HTTPException(404, "Attempt not found")
    return attempt


def _compute_score(q: Question, selected):
    if q.type == "pick":
        correct_ids = {c.id for c in q.choices if c.is_correct}
        selected_ids = set(selected) if isinstance(selected, list) else set()
        return score_pick_question(correct_ids, selected_ids)
    else:  # category
        correct_mapping = {c.id: c.category_label for c in q.choices}
        selected_mapping = (
            {int(k): v for k, v in selected.items()}
            if isinstance(selected, dict)
            else {}
        )
        return score_category_question(correct_mapping, selected_mapping)


def _build_results(attempt: Attempt, db: Session, lang: str = "de") -> ExamResults:
    answers = {a.question_id: a for a in attempt.answers}
    question_results: list[QuestionResult] = []
    total_score = 0.0
    max_total = 0.0

    chapter_scores: dict[int, dict] = {}

    for qid in attempt.question_order:
        q = db.query(Question).filter(Question.id == qid).first()
        if q is None:
            continue

        chapter = db.query(Chapter).filter(Chapter.id == q.chapter_id).first() if q.chapter_id else None
        ans = answers.get(qid)

        if ans:
            score = ans.score or 0.0
            result = _compute_score(q, ans.selected)
            correct_count = result.correct_count
            wrong_count = result.wrong_count
            is_overselected = result.is_overselected
            selected = ans.selected
        else:
            score = 0.0
            correct_count = wrong_count = 0
            is_overselected = False
            selected = []

        max_score = 1.0
        total_score += score
        max_total += max_score

        if q.chapter_id:
            if q.chapter_id not in chapter_scores:
                chapter_scores[q.chapter_id] = {
                    "chapter_id": q.chapter_id,
                    "chapter_name": chapter.name if chapter else "Unknown",
                    "score": 0.0,
                    "max_score": 0.0,
                }
            chapter_scores[q.chapter_id]["score"] += score
            chapter_scores[q.chapter_id]["max_score"] += max_score

        choices_out = [
            ChoiceOut(
                id=c.id,
                text=_resolve_text(c.text, c.text_en, lang),
                display_order=c.display_order,
                is_correct=c.is_correct,
                category_label=_resolve_label(c.category_label, c.category_label_en, lang),
                explanation=c.explanation,
            )
            for c in sorted(q.choices, key=lambda c: c.display_order)
        ]

        question_results.append(
            QuestionResult(
                question_id=qid,
                question_text=_resolve_text(q.text, q.text_en, lang),
                question_type=q.type,
                chapter_id=q.chapter_id,
                chapter_name=chapter.name if chapter else None,
                score=score,
                max_score=max_score,
                correct_count=correct_count,
                wrong_count=wrong_count,
                is_overselected=is_overselected,
                time_spent_s=ans.time_spent_s if ans else None,
                selected=selected,
                choices=choices_out,
                explanation=q.explanation,
            )
        )

    percentage = (total_score / max_total * 100) if max_total > 0 else 0.0
    chapter_breakdown = [
        {**v, "percentage": round(v["score"] / v["max_score"] * 100, 1) if v["max_score"] > 0 else 0}
        for v in chapter_scores.values()
    ]

    return ExamResults(
        attempt_id=attempt.id,
        username=attempt.username,
        mode=attempt.mode,
        started_at=attempt.started_at,
        finished_at=attempt.finished_at,
        total_score=total_score,
        max_total_score=max_total,
        percentage=round(percentage, 1),
        passed=percentage >= PASS_THRESHOLD * 100,
        question_results=question_results,
        chapter_breakdown=chapter_breakdown,
    )
