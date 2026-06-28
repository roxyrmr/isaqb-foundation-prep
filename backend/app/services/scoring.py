"""
Exact iSAQB CPSA-F scoring rules.

Pick questions (K = number of correct answers):
  - If selected count > K: score = 0  (over-selection penalty)
  - Otherwise: score = max(0, correct_selected - wrong_selected) / K

Category questions (N = number of statements):
  - score = correctly_placed / N
  - Over-assignment is structurally impossible (each statement maps to exactly one category)
"""

from dataclasses import dataclass


@dataclass
class ScoreResult:
    score: float
    max_score: float
    correct_count: int
    wrong_count: int
    is_overselected: bool


def score_pick_question(
    correct_ids: set[int],
    selected_ids: set[int],
    max_score: float = 1.0,
) -> ScoreResult:
    k = len(correct_ids)
    if k == 0:
        return ScoreResult(0.0, max_score, 0, 0, False)

    if len(selected_ids) > k:
        wrong = len(selected_ids - correct_ids)
        return ScoreResult(0.0, max_score, 0, wrong, True)

    correct_selected = len(selected_ids & correct_ids)
    wrong_selected = len(selected_ids - correct_ids)
    raw = (correct_selected - wrong_selected) / k
    score = max(0.0, raw) * max_score

    return ScoreResult(score, max_score, correct_selected, wrong_selected, False)


def score_category_question(
    correct_mapping: dict[int, str],  # choice_id -> correct category label
    selected_mapping: dict[int, str],  # choice_id -> selected category label
    max_score: float = 1.0,
) -> ScoreResult:
    n = len(correct_mapping)
    if n == 0:
        return ScoreResult(0.0, max_score, 0, 0, False)

    correct_count = sum(
        1
        for choice_id, label in selected_mapping.items()
        if correct_mapping.get(choice_id) == label
    )
    wrong_count = len(selected_mapping) - correct_count
    score = (correct_count / n) * max_score

    return ScoreResult(score, max_score, correct_count, wrong_count, False)
