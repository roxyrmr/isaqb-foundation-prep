from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class ChapterOut(BaseModel):
    id: int
    name: str
    learning_goal_code: Optional[str]
    description: Optional[str]
    question_count: int = 0
    exam_weight: float = 0.0  # iSAQB curriculum weight for exam mode

    model_config = {"from_attributes": True}


class ChoiceOut(BaseModel):
    id: int
    text: str
    display_order: int
    # Revealed only in study mode or after exam finishes
    is_correct: Optional[bool] = None
    category_label: Optional[str] = None
    explanation: Optional[str] = None

    model_config = {"from_attributes": True}


class QuestionOut(BaseModel):
    id: str
    type: str
    text: str
    chapter_id: Optional[int]
    difficulty: int
    version: str
    choices: list[ChoiceOut]
    explanation: Optional[str] = None
    # Always revealed — the real exam tells you how many to select
    correct_count: int = 0
    # Available categories for category questions (distinct labels)
    categories: list[str] = []

    model_config = {"from_attributes": True}


class StartExamRequest(BaseModel):
    mode: str = "exam"  # "exam" | "study"
    chapter_ids: list[int] = []  # empty = all chapters
    count: Optional[int] = None  # None = all questions
    username: Optional[str] = None
    shuffle: bool = True
    question_ids: Optional[list[str]] = None  # explicit IDs → retake same exam in same order


class StartExamResponse(BaseModel):
    attempt_id: str
    total_questions: int
    mode: str


class SubmitAnswerRequest(BaseModel):
    question_id: str
    # Pick: list of selected choice IDs
    # Category: {str(choice_id): category_label}
    selected: list[int] | dict[str, str]
    time_spent_s: Optional[float] = None


class AnswerFeedback(BaseModel):
    question_id: str
    score: float
    max_score: float
    correct_count: int
    wrong_count: int
    is_overselected: bool
    # Choices with is_correct revealed (study mode only)
    choices: Optional[list[ChoiceOut]] = None


class QuestionResult(BaseModel):
    question_id: str
    question_text: str
    question_type: str
    chapter_id: Optional[int]
    chapter_name: Optional[str]
    score: float
    max_score: float
    correct_count: int
    wrong_count: int
    is_overselected: bool
    time_spent_s: Optional[float]
    selected: list[int] | dict[str, str]
    choices: list[ChoiceOut]
    explanation: Optional[str]


class ExamResults(BaseModel):
    attempt_id: str
    username: Optional[str]
    mode: str
    started_at: datetime
    finished_at: Optional[datetime]
    total_score: float
    max_total_score: float
    percentage: float
    passed: bool  # iSAQB pass threshold: >=75%
    question_results: list[QuestionResult]
    chapter_breakdown: list[dict]


# Admin schemas
class QuestionCreate(BaseModel):
    id: str
    chapter_id: Optional[int] = None
    type: str
    text: str
    explanation: Optional[str] = None
    difficulty: int = 2
    version: str = "current"


class ChoiceCreate(BaseModel):
    text: str
    is_correct: bool
    category_label: Optional[str] = None
    explanation: Optional[str] = None
    display_order: int = 0


class QuestionWithChoicesCreate(BaseModel):
    question: QuestionCreate
    choices: list[ChoiceCreate]
