import pytest
from app.services.scoring import score_category_question, score_pick_question


class TestPickScoring:
    def test_all_correct(self):
        r = score_pick_question({1, 2}, {1, 2})
        assert r.score == pytest.approx(1.0)
        assert not r.is_overselected

    def test_partial_credit_no_wrong(self):
        r = score_pick_question({1, 2}, {1})
        assert r.score == pytest.approx(0.5)

    def test_partial_credit_with_wrong(self):
        # 1 correct, 1 wrong out of K=2 → (1-1)/2 = 0
        r = score_pick_question({1, 2}, {1, 3})
        assert r.score == pytest.approx(0.0)

    def test_overselection_zeroes_score(self):
        # K=2, selected 3 → score=0 regardless of correctness
        r = score_pick_question({1, 2}, {1, 2, 3})
        assert r.score == 0.0
        assert r.is_overselected

    def test_all_wrong(self):
        r = score_pick_question({1, 2}, {3, 4})
        assert r.score == 0.0

    def test_empty_selection(self):
        r = score_pick_question({1, 2}, set())
        assert r.score == 0.0

    def test_single_correct_answer(self):
        r = score_pick_question({1}, {1})
        assert r.score == pytest.approx(1.0)

    def test_single_wrong_selection(self):
        r = score_pick_question({1}, {2})
        assert r.score == 0.0

    def test_score_clamped_non_negative(self):
        # 0 correct, 1 wrong, K=2 → raw = -0.5 → clamped to 0
        r = score_pick_question({1, 2}, {3})
        assert r.score == 0.0

    def test_max_score_scaling(self):
        r = score_pick_question({1, 2}, {1, 2}, max_score=2.0)
        assert r.score == pytest.approx(2.0)


class TestCategoryScoring:
    def test_all_correct(self):
        correct = {1: "A", 2: "B", 3: "A"}
        selected = {1: "A", 2: "B", 3: "A"}
        r = score_category_question(correct, selected)
        assert r.score == pytest.approx(1.0)

    def test_partial_credit(self):
        correct = {1: "A", 2: "B", 3: "A"}
        selected = {1: "A", 2: "A", 3: "A"}  # choice 2 wrong
        r = score_category_question(correct, selected)
        assert r.score == pytest.approx(2 / 3)

    def test_all_wrong(self):
        correct = {1: "A", 2: "B"}
        selected = {1: "B", 2: "A"}
        r = score_category_question(correct, selected)
        assert r.score == 0.0

    def test_empty_selection(self):
        correct = {1: "A", 2: "B"}
        r = score_category_question(correct, {})
        assert r.score == 0.0

    def test_empty_correct_mapping(self):
        r = score_category_question({}, {1: "A"})
        assert r.score == 0.0
