from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import relationship
from .database import Base


class Chapter(Base):
    __tablename__ = "chapters"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    learning_goal_code = Column(String, unique=True, index=True)
    description = Column(Text, nullable=True)

    questions = relationship("Question", back_populates="chapter")


class Question(Base):
    __tablename__ = "questions"

    id = Column(String, primary_key=True, index=True)
    chapter_id = Column(Integer, ForeignKey("chapters.id"), nullable=True)
    type = Column(String, nullable=False)  # "pick" | "category"
    text = Column(Text, nullable=False)        # German (primary)
    text_en = Column(Text, nullable=True)      # English
    explanation = Column(Text, nullable=True)
    explanation_en = Column(Text, nullable=True)
    difficulty = Column(Integer, default=2)  # 1=easy, 2=medium, 3=hard
    version = Column(String, default="current")
    source_file = Column(String, nullable=True)
    is_manual = Column(Boolean, default=False)

    chapter = relationship("Chapter", back_populates="questions")
    choices = relationship("Choice", back_populates="question", cascade="all, delete-orphan", order_by="Choice.display_order")


class Choice(Base):
    __tablename__ = "choices"

    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(String, ForeignKey("questions.id"), nullable=False)
    text = Column(Text, nullable=False)        # German (primary)
    text_en = Column(Text, nullable=True)      # English
    is_correct = Column(Boolean, nullable=False, default=False)
    # For category questions: the label of the category this statement belongs to
    category_label = Column(String, nullable=True)       # German category name
    category_label_en = Column(String, nullable=True)    # English category name
    explanation = Column(Text, nullable=True)
    display_order = Column(Integer, default=0)

    question = relationship("Question", back_populates="choices")


class Attempt(Base):
    __tablename__ = "attempts"

    id = Column(String, primary_key=True, index=True)
    started_at = Column(DateTime, nullable=False)
    finished_at = Column(DateTime, nullable=True)
    mode = Column(String, default="exam")  # "exam" | "study"
    # {chapters: [1,2], count: 20, shuffle: true}
    config = Column(JSON, nullable=False, default=dict)
    # Ordered list of question IDs for this attempt (after shuffle)
    question_order = Column(JSON, nullable=False, default=list)
    shuffle_seed = Column(String, nullable=True)
    username = Column(String, nullable=True)

    answers = relationship("Answer", back_populates="attempt", cascade="all, delete-orphan")


class Answer(Base):
    __tablename__ = "answers"

    id = Column(Integer, primary_key=True, index=True)
    attempt_id = Column(String, ForeignKey("attempts.id"), nullable=False)
    question_id = Column(String, ForeignKey("questions.id"), nullable=False)
    # For pick: list of selected choice IDs
    # For category: {choice_id: selected_category_label}
    selected = Column(JSON, nullable=False, default=list)
    score = Column(Float, nullable=True)
    max_score = Column(Float, default=1.0)
    time_spent_s = Column(Float, nullable=True)

    attempt = relationship("Attempt", back_populates="answers")
