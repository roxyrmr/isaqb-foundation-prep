import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useLang } from "../context/LangContext";
import {
  type Answer,
  type Attempt,
  type Choice,
  type Question,
  CHAPTER_NAMES,
  createAttempt,
  loadAttempt,
  loadQuestions,
  saveAttempt,
} from "../engine";

export function ResultsPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const { lang, toggle: toggleLang } = useLang();
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [retaking, setRetaking] = useState(false);

  useEffect(() => {
    if (!attemptId) return;
    const a = loadAttempt(attemptId);
    if (!a) { navigate("/"); return; }
    setAttempt(a);
  }, [attemptId, navigate]);

  if (!attempt) return <div className="text-center py-24 text-gray-400">Loading results…</div>;

  const answered = Object.values(attempt.answers);
  const totalScore = answered.reduce((s, a) => s + a.score, 0);
  const maxTotal = attempt.questions.length;
  const percentage = maxTotal > 0 ? Math.round((totalScore / maxTotal) * 100 * 10) / 10 : 0;
  const passed = percentage >= 75;

  // Chapter breakdown
  const chapterMap: Record<string, { name: string; score: number; count: number }> = {};
  for (const q of attempt.questions) {
    const name = CHAPTER_NAMES[q.chapter_lg] ?? q.chapter_lg;
    if (!chapterMap[q.chapter_lg]) chapterMap[q.chapter_lg] = { name, score: 0, count: 0 };
    chapterMap[q.chapter_lg].count++;
    chapterMap[q.chapter_lg].score += (attempt.answers[q.id]?.score ?? 0);
  }

  const avgTime = answered.reduce((s, a) => s + a.time_spent_s, 0) / (answered.length || 1);

  async function handleRetake() {
    setRetaking(true);
    const allQs = await loadQuestions();
    const ids = new Set(attempt!.questions.map((q) => q.id));
    const pool = allQs.filter((q) => ids.has(q.id));
    const ordered = attempt!.questions
      .map((q) => pool.find((r) => r.id === q.id)!)
      .filter(Boolean);
    const newAttempt = createAttempt(ordered, attempt!.mode as "exam" | "study", {
      doShuffle: false,
      username: attempt!.username,
    });
    saveAttempt(newAttempt);
    navigate(`/exam/${newAttempt.id}`, {
      state: { total: newAttempt.questions.length, mode: newAttempt.mode },
    });
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Score banner */}
      <div className={`relative py-12 text-center ${passed ? "bg-green-600" : "bg-red-500"} text-white`}>
        <button
          onClick={toggleLang}
          className="absolute top-4 right-4 px-2.5 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-medium"
        >
          {lang === "de" ? "🇩🇪 DE" : "🇬🇧 EN"}
        </button>
        <h1 className="text-4xl font-bold">{percentage}%</h1>
        <p className="text-xl mt-2 font-medium">{passed ? "Passed" : "Not Passed"} — iSAQB threshold: 75%</p>
        <p className="text-sm mt-1 opacity-80">
          {totalScore.toFixed(1)} / {maxTotal} points · {attempt.questions.length} questions
        </p>
        {attempt.username && <p className="text-sm mt-1 opacity-70">{attempt.username}</p>}
      </div>

      <div className="max-w-3xl mx-auto px-4 mt-8 space-y-8">
        {/* Chapter breakdown */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Chapter Breakdown</h2>
          <div className="space-y-3">
            {Object.entries(chapterMap).map(([code, { name, score, count }]) => {
              const pct = count > 0 ? Math.round((score / count) * 100) : 0;
              return (
                <div key={code}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700">{name}</span>
                    <span className="font-medium text-gray-900">{pct}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${pct >= 75 ? "bg-green-500" : "bg-red-400"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Question review */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Question Review</h2>
          <div className="space-y-2">
            {attempt.questions.map((q, i) => {
              const ans = attempt.answers[q.id];
              const score = ans?.score ?? 0;
              const maxScore = ans?.max_score ?? 1;
              const isExpanded = expanded === q.id;
              const timeFlag = ans && ans.time_spent_s > avgTime * 1.5 && avgTime > 30;
              const qText = lang === "en" && q.text_en ? q.text_en : q.text;

              return (
                <div key={q.id} className="border border-gray-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpanded(isExpanded ? null : q.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                  >
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        score >= maxScore
                          ? "bg-green-100 text-green-700"
                          : score > 0
                          ? "bg-amber-100 text-amber-700"
                          : "bg-red-100 text-red-600"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className="flex-1 text-sm text-gray-800 truncate">{qText}</span>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {score.toFixed(2)}/{maxScore.toFixed(2)}
                      {timeFlag && <span className="ml-2 text-amber-500" title="Took longer than average">⏱</span>}
                    </span>
                  </button>
                  {isExpanded && <QuestionDetail question={q} answer={ans} lang={lang} />}
                </div>
              );
            })}
          </div>
        </section>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={handleRetake}
            disabled={retaking}
            className="px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {retaking ? "Starting…" : "Retake Same Questions"}
          </button>
          <button
            onClick={() => navigate("/")}
            className="px-8 py-3 border-2 border-blue-600 text-blue-600 rounded-xl font-semibold hover:bg-blue-50"
          >
            New Session
          </button>
        </div>
      </div>
    </div>
  );
}

function QuestionDetail({
  question,
  answer,
  lang,
}: {
  question: Question;
  answer: Answer | undefined;
  lang: string;
}) {
  const qText = lang === "en" && question.text_en ? question.text_en : question.text;
  const selected = answer?.selected;

  return (
    <div className="px-4 pb-4 bg-gray-50 border-t border-gray-200">
      <p className="text-sm text-gray-700 py-3">{qText}</p>
      {answer?.is_overselected && (
        <p className="text-xs text-red-600 mb-2">
          Over-selection: you selected more options than the number of correct answers (score = 0).
        </p>
      )}
      <div className="space-y-2">
        {question.choices.map((c: Choice) => {
          const wasSelected = Array.isArray(selected)
            ? (selected as number[]).includes(c.id)
            : selected && (selected as Record<string, string>)[String(c.id)] !== undefined;

          const label = lang === "en" && c.category_label_en ? c.category_label_en : c.category_label;
          const isCorrectPick = question.type === "pick" && c.is_correct;
          const userCat = selected && (selected as Record<string, string>)[String(c.id)];
          const isCorrectCat = question.type === "category" && wasSelected && userCat === c.category_label;
          const isWrong = wasSelected && !isCorrectPick && !isCorrectCat;
          const choiceText = lang === "en" && c.text_en ? c.text_en : c.text;

          return (
            <div
              key={c.id}
              className={`flex items-start gap-2 p-2 rounded text-xs ${
                isCorrectPick ? "bg-green-100 text-green-800" : isWrong ? "bg-red-100 text-red-700" : "text-gray-600"
              }`}
            >
              <span className="mt-0.5 flex-shrink-0">
                {isCorrectPick ? "✓" : isWrong ? "✗" : "○"}
              </span>
              <span>{choiceText}</span>
              {question.type === "category" && label && (
                <span className="ml-auto text-gray-400">{label}</span>
              )}
            </div>
          );
        })}
      </div>
      {question.explanation && (
        <p className="mt-3 text-xs text-gray-500 italic border-t border-gray-200 pt-3">
          {question.explanation}
        </p>
      )}
    </div>
  );
}
