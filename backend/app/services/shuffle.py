import hashlib
import random
from typing import TypeVar

T = TypeVar("T")


def make_seed(attempt_id: str, question_id: str) -> int:
    """Deterministic, collision-free seed per (attempt, question) pair."""
    raw = f"{attempt_id}:{question_id}".encode()
    digest = hashlib.sha256(raw).digest()
    return int.from_bytes(digest[:8], "big")


def shuffled(items: list[T], seed: int) -> list[T]:
    rng = random.Random(seed)
    result = list(items)
    rng.shuffle(result)
    return result
