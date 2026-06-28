import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { CategoryQuestion } from "../components/CategoryQuestion";
import { PickQuestion } from "../components/PickQuestion";
import { useLang } from "../context/LangContext";
import { type Answer, type Attempt, type Question, loadAttempt, saveAttempt, scoreAnswer } from "../engine";
import { t, tPartial, tIncorrect, tSelectN } from "../i18n";

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
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const questionStartRef = useRef(Date.now());
  const finishCalledRef = useRef(false);
  const navRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!navRef.current) return;
    const active = navRef.current.querySelector<HTMLElement>("[data-current]");
    active?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [index]);

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

  if (!attempt) return <div className="text-center py-24 text-slate-400">Loading…</div>;

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

  function jumpToQuestion(targetIndex: number) {
    if (!isStudy && isAnswered && !attempt!.answers[question.id]) {
      const updated = submitCurrent(attempt!);
      saveAttempt(updated);
      setAttempt(updated);
    }
    setIndex(targetIndex);
  }

  function toggleFlag() {
    const id = question.id;
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const isLast = index === total - 1;
  const isAnswered =
    question.type === "pick" ? pickSelected.length > 0 : Object.keys(catSelected).length > 0;
  const revealAnswers = isStudy && answered;
  const isFlagged = flagged.has(question.id);
  const progressPct = ((index + 1) / total) * 100;

  const timerCls =
    remaining !== null && remaining <= 5 * 60
      ? "bg-red-50 border-red-300 text-red-700"
      : remaining !== null && remaining <= 10 * 60
      ? "bg-amber-50 border-amber-300 text-amber-700"
      : "bg-slate-50 border-slate-200 text-slate-600";

  const questionTypeBadge =
    question.type === "pick"
      ? question.correct_count > 1
        ? `${t("multiChoice", lang)} · ${question.correct_count} ${t("correctWord", lang)}`
        : t("singleChoice", lang)
      : t("categoryType", lang);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">

      {/* Top progress strip */}
      <div className="h-[3px] bg-indigo-100 flex-shrink-0">
        <div
          className="h-[3px] bg-indigo-500 transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-5 py-3 flex items-center gap-3 flex-shrink-0" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <div className="flex-shrink-0">
          <span className="text-sm font-bold text-slate-800">
            Q{index + 1}
            <span className="text-slate-400 font-normal"> / {total}</span>
          </span>
          {isStudy && (
            <span className="ml-2 text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide">
              {t("studyBadge", lang)}
            </span>
          )}
        </div>

        <div className="w-1 h-4 bg-slate-200 flex-shrink-0" />
        <span className="text-[10px] font-semibold text-slate-400 flex-shrink-0 uppercase tracking-wide">
          {question.chapter_lg}
        </span>

        <div className="flex-1" />

        {!isStudy && remaining !== null && (
          <div className={`flex items-center gap-1.5 font-mono text-xs font-bold px-3 py-1.5 rounded-lg border flex-shrink-0 tabular-nums ${timerCls}`}>
            <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="8" cy="8.5" r="6" />
              <path d="M8 5.5v3l2 1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M6 1.5h4M8 1.5v1.5" strokeLinecap="round" />
            </svg>
            {String(Math.floor(remaining / 60)).padStart(2, "0")}:{String(Math.floor(remaining % 60)).padStart(2, "0")}
          </div>
        )}

        <button
          onClick={toggleFlag}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 border rounded-lg text-xs font-semibold transition-colors flex-shrink-0 ${
            isFlagged
              ? "bg-amber-50 border-amber-300 text-amber-700"
              : "border-slate-200 text-slate-500 hover:border-amber-300 hover:text-amber-600"
          }`}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 1.5v11M2 1.5h9.5L10 5.5l1.5 4H2" />
          </svg>
          {isFlagged ? t("flaggedLabel", lang) : t("flagLabel", lang)}
        </button>

        <button
          onClick={toggleLang}
          className="flex items-center gap-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:border-slate-300 transition-colors flex-shrink-0"
        >
          {t("switchLang", lang)}
        </button>

        <button
          onClick={handleFinish}
          className="text-xs text-slate-500 border border-slate-200 px-3 py-1.5 rounded-lg hover:border-slate-300 flex-shrink-0 transition-colors"
        >
          {t("finish", lang)}
        </button>
      </header>

      {/* Question */}
      <main className="flex-1 flex items-start justify-center px-4 pt-8 pb-4">
        <div
          className="w-full max-w-2xl bg-white rounded-2xl p-8 flex flex-col gap-6"
          style={{ boxShadow: "0 2px 4px rgba(0,0,0,0.05), 0 12px 32px rgba(0,0,0,0.06)" }}
        >
          {/* Question meta */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full" style={{ letterSpacing: "0.05em" }}>
              {questionTypeBadge}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">{question.chapter_lg}</span>
          </div>

          <p className="text-lg text-slate-900 leading-relaxed font-medium">
            {lang === "en" && question.text_en ? question.text_en : question.text}
          </p>

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
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                  : feedback.score > 0
                  ? "bg-amber-50 border border-amber-200 text-amber-800"
                  : "bg-red-50 border border-red-200 text-red-700"
              }`}
            >
              {feedback.is_overselected
                ? t("overSelected", lang)
                : feedback.score >= feedback.max_score
                ? t("correctFeedback", lang)
                : feedback.score > 0
                ? tPartial(feedback.correct_count, feedback.wrong_count, lang)
                : tIncorrect(feedback.correct_count, feedback.wrong_count, lang)}
              <span className="ml-2 font-semibold">
                {feedback.score.toFixed(2)} / {feedback.max_score.toFixed(2)}
              </span>
              {question.explanation && (
                <p className="mt-2 text-xs text-slate-600 italic">{question.explanation}</p>
              )}
            </div>
          )}

          <div className="flex justify-between pt-1">
            <button
              onClick={() => setIndex((i) => i - 1)}
              disabled={index === 0}
              className="px-4 py-2 border-[1.5px] border-slate-200 rounded-xl text-sm text-slate-600 hover:border-slate-300 disabled:opacity-30 transition-colors"
            >
              {t("prev", lang)}
            </button>

            <div className="flex gap-3">
              {isStudy && !answered && (
                <button
                  onClick={handleCheckAnswer}
                  disabled={!isAnswered}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-40 transition-colors"
                  style={{ boxShadow: "0 2px 8px rgba(79,70,229,0.3)" }}
                >
                  {t("checkAnswer", lang)}
                </button>
              )}

              {!isStudy && isLast && (
                <button
                  onClick={handleFinish}
                  className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors"
                >
                  {t("finishExam", lang)}
                </button>
              )}

              {!isStudy && !isLast && (
                <button
                  onClick={handleNext}
                  disabled={!isAnswered}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-40 transition-colors"
                  style={{ boxShadow: "0 2px 8px rgba(79,70,229,0.3)" }}
                >
                  {t("next", lang)}
                </button>
              )}

              {isStudy && answered && isLast && (
                <button
                  onClick={handleFinish}
                  className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors"
                >
                  {t("seeResults", lang)}
                </button>
              )}

              {isStudy && answered && !isLast && (
                <button
                  onClick={() => setIndex((i) => i + 1)}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
                  style={{ boxShadow: "0 2px 8px rgba(79,70,229,0.3)" }}
                >
                  {t("next", lang)}
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Question navigator */}
      <div className="bg-white border-t border-slate-200 px-4 pt-2 pb-3 flex-shrink-0" style={{ boxShadow: "0 -1px 4px rgba(0,0,0,0.03)" }}>
        <div ref={navRef} className="overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          <div className="flex gap-1 w-max mx-auto">
            {attempt.questions.map((q, i) => {
              const isAns = !!attempt.answers[q.id];
              const isCur = i === index;
              const isFlag = flagged.has(q.id);
              return (
                <button
                  key={q.id}
                  data-current={isCur ? "" : undefined}
                  onClick={() => jumpToQuestion(i)}
                  title={`Question ${i + 1}`}
                  className={`w-7 h-7 flex-shrink-0 flex items-center justify-center text-[10px] font-mono font-bold rounded-md border-[1.5px] transition-all ${
                    isCur
                      ? "bg-indigo-600 border-indigo-600 text-white"
                      : isFlag
                      ? "bg-amber-50 border-amber-300 text-amber-700"
                      : isAns
                      ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                      : "bg-white border-slate-200 text-slate-400 hover:border-indigo-300"
                  }`}
                  style={isCur ? { boxShadow: "0 1px 4px rgba(79,70,229,0.4)" } : {}}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex justify-center gap-4 mt-2 text-[10px] text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-50 border border-emerald-300 inline-block" />
            {t("answeredLabel", lang)}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-50 border border-amber-300 inline-block" />
            {t("flaggedLabel", lang)}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-white border border-slate-200 inline-block" />
            {t("notAnsweredLabel", lang)}
          </span>
        </div>
      </div>
    </div>
  );
}
