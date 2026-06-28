from app.services.shuffle import make_seed, shuffled


def test_same_inputs_same_seed():
    assert make_seed("attempt-1", "q-001") == make_seed("attempt-1", "q-001")


def test_different_question_ids_different_seeds():
    # The original JS bug: questions with same-length IDs got the same shuffle.
    # These two IDs have the same length but must produce different seeds.
    s1 = make_seed("attempt-1", "Q-20-04-01")
    s2 = make_seed("attempt-1", "Q-20-04-02")
    assert s1 != s2


def test_different_attempts_different_seeds():
    s1 = make_seed("attempt-aaa", "q-001")
    s2 = make_seed("attempt-bbb", "q-001")
    assert s1 != s2


def test_shuffled_is_deterministic():
    items = list(range(10))
    assert shuffled(items, 42) == shuffled(items, 42)


def test_shuffled_does_not_mutate():
    items = [1, 2, 3, 4, 5]
    original = items.copy()
    shuffled(items, 99)
    assert items == original


def test_shuffled_contains_all_elements():
    items = list(range(20))
    result = shuffled(items, 12345)
    assert sorted(result) == items
