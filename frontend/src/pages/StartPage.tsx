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
    <div className="min-h-screen bg-gray-50 flex items-start justify-center pt-12 px-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">iSAQB CPSA-F Practice Exam</h1>
            <p className="text-gray-500 text-sm mt-1">
              Certified Professional for Software Architecture — Foundation Level
            </p>
          </div>
          <button
            onClick={toggleLang}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:border-gray-400 transition-colors"
          >
            <span>{lang === "de" ? "🇩🇪" : "🇬🇧"}</span>
            <span>{lang === "de" ? "DE" : "EN"}</span>
          </button>
        </div>

        {loadError && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">{loadError}</p>
        )}

        {/* Mode toggle */}
        <section>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Mode</h2>
          <div className="grid grid-cols-2 gap-3">
            {(["exam", "study"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`p-4 rounded-xl border-2 text-left transition-colors ${
                  mode === m ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="font-semibold text-gray-900 capitalize">{m}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {m === "exam"
                    ? "Weighted question set matching the real CPSA-F distribution. No feedback until the end."
                    : "Pick your topics. Instant per-question feedback with correct answers shown."}
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Study options */}
        {mode === "study" && (
          <section className="space-y-5">
            <div>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
                Topics <span className="text-gray-400 font-normal normal-case">(leave empty for all)</span>
              </h2>
              {chapters.length === 0 ? (
                <p className="text-sm text-gray-400">Loading…</p>
              ) : (
                <div className="space-y-2">
                  {chapters.map((ch) => (
                    <label
                      key={ch.code}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedChapters.includes(ch.code)
                          ? "border-blue-400 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="rounded"
                        checked={selectedChapters.includes(ch.code)}
                        onChange={() => toggleChapter(ch.code)}
                      />
                      <span className="text-xs font-mono text-gray-400 flex-shrink-0 w-12">{ch.code}</span>
                      <span className="flex-1 text-sm text-gray-800">{ch.name}</span>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full flex-shrink-0">
                        {ch.count}q
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest block mb-2">
                  Question Limit <span className="text-gray-400 font-normal">({availableCount} available)</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={availableCount}
                  placeholder={`All (${availableCount})`}
                  value={studyCount}
                  onChange={(e) => setStudyCount(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={doShuffle}
                    onChange={(e) => setDoShuffle(e.target.checked)}
                    className="rounded"
                  />
                  Shuffle order
                </label>
              </div>
            </div>
          </section>
        )}

        {/* Username */}
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest block mb-2">
            Username <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            placeholder="Your name"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <button
          onClick={handleStart}
          disabled={!ready || starting}
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {!ready ? "Loading questions…" : starting ? "Starting…" : mode === "exam" ? "Start Exam" : "Start Study Session"}
        </button>

        <p className="text-xs text-center text-gray-400">
          {questions.length} questions across {chapters.length} learning goals
        </p>
      </div>
    </div>
  );
}
