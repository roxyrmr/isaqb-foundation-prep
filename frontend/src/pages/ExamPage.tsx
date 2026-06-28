import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { CategoryQuestion } from "../components/CategoryQuestion";
import { PickQuestion } from "../components/PickQuestion";
import { useLang } from "../context/LangContext";
import { type Answer, type Attempt, type Question, loadAttempt, saveAttempt, scoreAnswer } from "../engine";

export function ExamPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { lang, toggle: toggleLang } = useLang();

  const total: number = location.state?.total ?? 0;
  const mode: string = location.state?.mode ?? "exam";
  const isStudy = mode === "study";

  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [index, setIndex] = useState(0);
  const [pickSelected, setPickSelected] = useState<number[]>([]);
  const [catSelected, setCatSelected] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Answer | null>(null);
  const [answered, setAnswered] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const questionStartRef = useRef(Date.now());
  const finishCalledRef = useRef(false);

  useEffect(() => {
    if (!attemptId) return;
    const a = loadAttempt(attemptId);
    if (!a) { navigate("/"); return; }
    setAttempt(a);
  }, [attemptId, navigate]);

  useEffect(() => {
    setPickSelected([]);
    setCatSelected({});
    setFeedback(null);
    setAnswered(false);
    questionStartRef.current = Date.now();
  }, [index]);

  // Tick every second to update remaining time
  useEffect(() => {
    if (!attempt?.duration_s) return;
    const tick = () => {
      const elapsed = (Date.now() - new Date(attempt.started_at).getTime()) / 1000;
      setRemaining(Math.max(0, attempt.duration_s! - elapsed));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [attempt?.id, attempt?.started_at, attempt?.duration_s]);

  // Auto-finish when time reaches zero (uses latest attempt state, not a stale closure)
  useEffect(() => {
    if (remaining !== null && remaining <= 0 && attempt && !isStudy && !finishCalledRef.current) {
      finishCalledRef.current = true;
      const finished: Attempt = { ...attempt, finished_at: new Date().toISOString() };
      saveAttempt(finished);
      navigate(`/results/${attempt.id}`);
    }
  }, [remaining, attempt, isStudy, navigate]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") {
        if (isStudy && !answered) return;
        if (index < total - 1) setIndex((i) => i + 1);
      } else if (e.key === "ArrowLeft" && index > 0) {
        setIndex((i) => i - 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, total, isStudy, answered]);

  if (!attempt) return <div className="text-center py-24 text-gray-400">Loading…</div>;

  const question: Question = attempt.questions[index];
  const elapsed = () => (Date.now() - questionStartRef.current) / 1000;

  function submitCurrent(att: Attempt): Attempt {
    const sel = question.type === "pick" ? pickSelected : catSelected;
    const answer = scoreAnswer(question, sel as number[] | Record<string, string>, elapsed());
    return { ...att, answers: { ...att.answers, [question.id]: answer } };
  }

  function handleCheckAnswer() {
    const updated = submitCurrent(attempt!);
    setAttempt(updated);
    saveAttempt(updated);
    setFeedback(updated.answers[question.id]);
    setAnswered(true);
  }

  function handleNext() {
    const updated = isStudy ? attempt! : submitCurrent(attempt!);
    saveAttempt(updated);
    setAttempt(updated);
    setIndex((i) => i + 1);
  }

  function handleFinish() {
    const withAnswer = isStudy ? attempt! : submitCurrent(attempt!);
    const finished: Attempt = { ...withAnswer, finished_at: new Date().toISOString() };
    saveAttempt(finished);
    navigate(`/results/${attempt!.id}`);
  }

  const isLast = index === total - 1;
  const isAnswered =
    question.type === "pick" ? pickSelected.length > 0 : Object.keys(catSelected).length > 0;
  const revealAnswers = isStudy && answered;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <span className="text-sm font-medium text-gray-600">
            Question {index + 1} of {total}
          </span>
          {isStudy && (
            <span className="ml-3 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
              Study Mode
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="w-48 bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${((index + 1) / total) * 100}%` }}
            />
          </div>
          {!isStudy && remaining !== null && (
            <div
              className={`flex items-center gap-1.5 font-mono text-sm font-semibold px-3 py-1 rounded-lg border ${
                remaining <= 5 * 60
                  ? "bg-red-50 border-red-300 text-red-700"
                  : remaining <= 10 * 60
                  ? "bg-amber-50 border-amber-300 text-amber-700"
                  : "bg-gray-50 border-gray-200 text-gray-600"
              }`}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="8" cy="8.5" r="6" />
                <path d="M8 5.5v3l2 1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M6 1.5h4M8 1.5v1.5" strokeLinecap="round" />
              </svg>
              {String(Math.floor(remaining / 60)).padStart(2, "0")}:{String(Math.floor(remaining % 60)).padStart(2, "0")}
            </div>
          )}
          <button
            onClick={toggleLang}
            className="flex items-center gap-1 px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-600 hover:border-gray-400 transition-colors"
          >
            {lang === "de" ? "🇩🇪 DE" : "🇬🇧 EN"}
          </button>
          <button
            onClick={handleFinish}
            className="text-xs text-gray-500 border border-gray-300 px-3 py-1.5 rounded-lg hover:border-gray-400"
          >
            Finish
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 pt-10 pb-24">
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-6">
          <div>
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              {question.type === "pick" ? "Single / Multiple Choice" : "Category Assignment"}
            </span>
            <p className="mt-2 text-lg text-gray-900 leading-relaxed">
              {lang === "en" && question.text_en ? question.text_en : question.text}
            </p>
          </div>

          {question.type === "pick" ? (
            <PickQuestion
              choices={question.choices}
              lang={lang}
              selected={pickSelected}
              correctCount={question.correct_count}
              onChange={setPickSelected}
              disabled={isStudy && answered}
              revealAnswers={revealAnswers}
            />
          ) : (
            <CategoryQuestion
              choices={question.choices}
              lang={lang}
              categories={lang === "en" ? question.categories_en : question.categories}
              selected={catSelected}
              onChange={setCatSelected}
              disabled={isStudy && answered}
              revealAnswers={revealAnswers}
            />
          )}

          {feedback && isStudy && (
            <div
              className={`rounded-xl p-4 text-sm ${
                feedback.score >= feedback.max_score
                  ? "bg-green-50 border border-green-200 text-green-800"
                  : feedback.score > 0
                  ? "bg-amber-50 border border-amber-200 text-amber-800"
                  : "bg-red-50 border border-red-200 text-red-700"
              }`}
            >
              {feedback.is_overselected
                ? "Over-selection: more options selected than correct answers — score is 0."
                : feedback.score >= feedback.max_score
                ? "Correct!"
                : feedback.score > 0
                ? `Partial credit: ${feedback.correct_count} correct, ${feedback.wrong_count} wrong.`
                : `Incorrect: ${feedback.correct_count} correct, ${feedback.wrong_count} wrong.`}
              <span className="ml-2 font-semibold">
                {feedback.score.toFixed(2)} / {feedback.max_score.toFixed(2)}
              </span>
              {question.explanation && (
                <p className="mt-2 text-xs text-gray-600 italic">{question.explanation}</p>
              )}
            </div>
          )}

          <div className="flex justify-between pt-2">
            <button
              onClick={() => setIndex((i) => i - 1)}
              disabled={index === 0}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:border-gray-400 disabled:opacity-30"
            >
              ← Previous
            </button>

            <div className="flex gap-3">
              {isStudy && !answered && (
                <button
                  onClick={handleCheckAnswer}
                  disabled={!isAnswered}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  Check Answer
                </button>
              )}

              {!isStudy && isLast && (
                <button
                  onClick={handleFinish}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700"
                >
                  Finish Exam
                </button>
              )}

              {!isStudy && !isLast && (
                <button
                  onClick={handleNext}
                  disabled={!isAnswered}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  Next →
                </button>
              )}

              {isStudy && answered && isLast && (
                <button
                  onClick={handleFinish}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700"
                >
                  See Results
                </button>
              )}

              {isStudy && answered && !isLast && (
                <button
                  onClick={() => setIndex((i) => i + 1)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
                >
                  Next →
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
