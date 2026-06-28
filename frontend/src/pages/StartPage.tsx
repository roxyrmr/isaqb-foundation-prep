import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  type ChapterInfo,
  type RawQuestion,
  createAttempt,
  getChapterStats,
  loadQuestions,
  saveAttempt,
} from "../engine";
import { useLang } from "../context/LangContext";
import { t } from "../i18n";

export function StartPage() {
  const navigate = useNavigate();
  const { lang, toggle: toggleLang } = useLang();

  const [questions, setQuestions] = useState<RawQuestion[]>([]);
  const [chapters, setChapters] = useState<ChapterInfo[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [mode, setMode] = useState<"exam" | "study">("exam");
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
  const [studyCount, setStudyCount] = useState<number | "">("");
  const [doShuffle, setDoShuffle] = useState(true);
  const [username, setUsername] = useState("");
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    loadQuestions()
      .then((qs) => {
        setQuestions(qs);
        setChapters(getChapterStats(qs));
      })
      .catch((e: unknown) =>
        setLoadError(e instanceof Error ? e.message : "Failed to load questions")
      );
  }, []);

  const availableCount =
    selectedChapters.length === 0
      ? questions.length
      : questions.filter((q) => selectedChapters.includes(q.chapter_lg)).length;

  function toggleChapter(code: string) {
    setSelectedChapters((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  }

  function handleStart() {
    setStarting(true);
    const attempt = createAttempt(questions, mode, {
      chapterFilter: mode === "study" ? selectedChapters : [],
      count: mode === "study" && studyCount !== "" ? Number(studyCount) : undefined,
      doShuffle: mode === "study" ? doShuffle : true,
      username: username.trim() || null,
    });
    saveAttempt(attempt);
    navigate(`/exam/${attempt.id}`, {
      state: { total: attempt.questions.length, mode: attempt.mode },
    });
  }

  const ready = questions.length > 0;

  return (
    <div className="min-h-screen bg-slate-100">

      {/* Hero header */}
      <div
        className="relative overflow-hidden px-6 py-14 text-center"
        style={{ background: "linear-gradient(135deg, #1E1B4B 0%, #312E81 60%, #3730A3 100%)" }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 70% 40%, rgba(129,140,248,0.22) 0%, transparent 65%)" }}
        />
        <button
          onClick={toggleLang}
          className="absolute top-4 right-5 flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/20 text-xs font-semibold text-white/80 hover:bg-white/10 transition-colors"
          style={{ background: "rgba(255,255,255,0.08)" }}
        >
          {t("switchLang", lang)}
        </button>
        <p className="text-[10px] font-bold uppercase text-indigo-300 mb-2" style={{ letterSpacing: "0.15em" }}>
          {t("certPractice", lang)}
        </p>
        <h1 className="text-2xl font-extrabold text-white leading-snug" style={{ letterSpacing: "-0.02em" }}>
          CPSA-F Exam Prep
        </h1>
        <p className="mt-2 text-sm text-white/60">
          Certified Professional for Software Architecture · Foundation Level
        </p>
      </div>

      {/* Content */}
      <div className="max-w-[560px] mx-auto px-4 pt-7 pb-16 flex flex-col gap-6">

        {loadError && (
          <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{loadError}</p>
        )}

        {/* Mode selector */}
        <div>
          <p className="text-[10px] font-bold uppercase text-slate-500 mb-3" style={{ letterSpacing: "0.1em" }}>
            {t("chooseModeLabel", lang)}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {(["exam", "study"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`text-left p-5 rounded-2xl border-2 transition-all ${
                  mode === m
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-slate-200 bg-white hover:border-indigo-200"
                }`}
                style={mode === m ? { boxShadow: "0 4px 12px rgba(79,70,229,0.12)" } : {}}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 transition-colors ${
                    mode === m ? "bg-indigo-500" : "bg-indigo-100"
                  }`}
                >
                  {m === "exam" ? (
                    <svg
                      width="17" height="17" viewBox="0 0 24 24" fill="none"
                      stroke={mode === m ? "white" : "#6366F1"}
                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    >
                      <rect x="9" y="2" width="6" height="4" rx="1"/>
                      <path d="M4 6h16M4 6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2"/>
                      <path d="M9 12h6M9 16h4"/>
                    </svg>
                  ) : (
                    <svg
                      width="17" height="17" viewBox="0 0 24 24" fill="none"
                      stroke={mode === m ? "white" : "#6366F1"}
                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    >
                      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                    </svg>
                  )}
                </div>
                <div className="text-sm font-bold text-slate-900 mb-1">
                  {m === "exam" ? t("examModeTitle", lang) : t("studyModeTitle", lang)}
                </div>
                <div className="text-[11.5px] text-slate-500 leading-relaxed">
                  {m === "exam" ? t("examModeDesc", lang) : t("studyModeDesc", lang)}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Exam format stats */}
        {mode === "exam" && (
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-500 mb-3" style={{ letterSpacing: "0.1em" }}>
              {t("examFormatLabel", lang)}
            </p>
            <div className="flex gap-3">
              {[
                { value: "75 min", label: t("timeLimitLabel", lang) },
                { value: "32–44", label: t("questionsLabel", lang) },
                { value: "60%", label: t("passThresholdLabel", lang) },
              ].map(({ value, label }) => (
                <div key={label} className="flex-1 bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm">
                  <div className="text-xl font-extrabold text-indigo-600 tabular-nums" style={{ letterSpacing: "-0.02em" }}>
                    {value}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1" style={{ letterSpacing: "0.04em" }}>
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Study options */}
        {mode === "study" && (
          <div className="flex flex-col gap-5">
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-500 mb-3" style={{ letterSpacing: "0.1em" }}>
                {t("topicsLabel", lang)} <span className="text-slate-400 font-normal normal-case" style={{ letterSpacing: 0 }}>{t("leaveEmpty", lang)}</span>
              </p>
              {chapters.length === 0 ? (
                <p className="text-sm text-slate-400">Loading…</p>
              ) : (
                <div className="space-y-2">
                  {chapters.map((ch) => (
                    <label
                      key={ch.code}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        selectedChapters.includes(ch.code)
                          ? "border-indigo-400 bg-indigo-50"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="rounded"
                        checked={selectedChapters.includes(ch.code)}
                        onChange={() => toggleChapter(ch.code)}
                      />
                      <span className="text-xs font-mono text-slate-400 flex-shrink-0 w-12">{ch.code}</span>
                      <span className="flex-1 text-sm text-slate-800">{ch.name}</span>
                      <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full flex-shrink-0">
                        {ch.count}q
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-2" style={{ letterSpacing: "0.1em" }}>
                  {t("qLimitLabel", lang)}{" "}
                  <span className="font-normal normal-case text-slate-400" style={{ letterSpacing: 0 }}>
                    ({availableCount} available)
                  </span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={availableCount}
                  placeholder={`All (${availableCount})`}
                  value={studyCount}
                  onChange={(e) => setStudyCount(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full border-[1.5px] border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all"
                />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={doShuffle}
                    onChange={(e) => setDoShuffle(e.target.checked)}
                    className="rounded"
                  />
                  {t("shuffleLabel", lang)}
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Username */}
        <div>
          <label className="block text-[11px] font-bold uppercase text-slate-500 mb-2" style={{ letterSpacing: "0.07em" }}>
            {t("usernameLabel", lang)}{" "}
            <span className="font-normal normal-case text-slate-400" style={{ letterSpacing: 0 }}>
              {t("optional", lang)}
            </span>
          </label>
          <input
            type="text"
            placeholder={t("yourName", lang)}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full border-[1.5px] border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all"
          />
        </div>

        {/* CTA */}
        <button
          onClick={handleStart}
          disabled={!ready || starting}
          className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-[15px] hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          style={{ boxShadow: "0 4px 14px rgba(79,70,229,0.35)" }}
        >
          {!ready
            ? t("loadingQ", lang)
            : starting
            ? t("starting", lang)
            : mode === "exam"
            ? t("startExam", lang)
            : t("startStudy", lang)}
          {ready && !starting && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          )}
        </button>

        <p className="text-xs text-center text-slate-400">
          {questions.length} questions · {chapters.length} learning goals · no login required
        </p>
      </div>
    </div>
  );
}
