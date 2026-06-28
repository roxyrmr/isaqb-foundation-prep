// Static exam engine — no backend required.
// All exam logic (sampling, shuffling, scoring) runs in the browser.
// Attempt state is persisted in sessionStorage.

export interface RawChoice {
  text: string;
  text_en: string;
  is_correct: boolean;
  category_label?: string;
  category_label_en?: string;
}

export interface RawQuestion {
  id: string;
  chapter_lg: string;
  type: "pick" | "category";
  difficulty: number;
  text: string;
  text_en: string;
  explanation: string;
  choices: RawChoice[];
}

export interface Choice {
  id: number;           // index within original choices array (stable across shuffles)
  text: string;
  text_en: string;
  is_correct: boolean;
  category_label: string | null;
  category_label_en: string | null;
}

export interface Question {
  id: string;
  chapter_lg: string;
  type: "pick" | "category";
  difficulty: number;
  text: string;
  text_en: string;
  explanation: string;
  choices: Choice[];     // shuffled per-attempt
  correct_count: number;
  categories: string[];
  categories_en: string[];
}

export interface Answer {
  selected: number[] | Record<string, string>;
  score: number;
  max_score: number;
  correct_count: number;
  wrong_count: number;
  is_overselected: boolean;
  time_spent_s: number;
}

export interface Attempt {
  id: string;
  mode: "exam" | "study";
  username: string | null;
  started_at: string;
  finished_at: string | null;
  duration_s: number | null; // null = untimed (study mode)
  questions: Question[];
  answers: Record<string, Answer>;
}

// ── RNG (mulberry32 — fast, seedable, good distribution) ──────────────────

function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStr(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sample<T>(arr: T[], n: number, rng: () => number): T[] {
  const a = [...arr];
  for (let i = 0; i < Math.min(n, a.length); i++) {
    const j = i + Math.floor(rng() * (a.length - i));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, Math.min(n, a.length));
}

// ── Chapter config ─────────────────────────────────────────────────────────

// Keep in sync with backend/app/routers/constants.py → CPSA_F_WEIGHTS
const CHAPTER_WEIGHTS: Record<string, number> = {
  "LG-01": 0.10,
  "LG-02": 0.20,
  "LG-03": 0.35,
  "LG-04": 0.25,
  "LG-05": 0.10,
};

export const CHAPTER_NAMES: Record<string, string> = {
  "LG-01": "Basic Concepts of Software Architecture",
  "LG-02": "Requirements and Quality Attributes",
  "LG-03": "Design and Development",
  "LG-04": "Specification and Communication",
  "LG-05": "Architecture Analysis and Evaluation",
};

// ── Question processing ────────────────────────────────────────────────────

function processQuestion(raw: RawQuestion, attemptId: string): Question {
  const rng = mulberry32(hashStr(attemptId + raw.id));

  const choices: Choice[] = raw.choices.map((c, i) => ({
    id: i,
    text: c.text,
    text_en: c.text_en,
    is_correct: c.is_correct,
    category_label: c.category_label ?? null,
    category_label_en: c.category_label_en ?? null,
  }));

  const shuffledChoices = shuffle(choices, rng);

  const categories: string[] = [];
  const categories_en: string[] = [];
  const seen = new Set<string>();
  for (const c of raw.choices) {
    if (c.category_label && !seen.has(c.category_label)) {
      seen.add(c.category_label);
      categories.push(c.category_label);
      categories_en.push(c.category_label_en ?? c.category_label);
    }
  }

  return {
    id: raw.id,
    chapter_lg: raw.chapter_lg,
    type: raw.type,
    difficulty: raw.difficulty,
    text: raw.text,
    text_en: raw.text_en,
    explanation: raw.explanation,
    choices: shuffledChoices,
    correct_count: raw.choices.filter((c) => c.is_correct).length,
    categories,
    categories_en,
  };
}

// ── Attempt creation ───────────────────────────────────────────────────────

export function createAttempt(
  allQuestions: RawQuestion[],
  mode: "exam" | "study",
  options: {
    chapterFilter?: string[];
    count?: number;
    doShuffle?: boolean;
    username?: string | null;
  }
): Attempt {
  const id = crypto.randomUUID();
  const rng = mulberry32(hashStr(id));

  let selected: RawQuestion[];

  if (mode === "exam") {
    const total = Math.floor(rng() * 13) + 32; // 32–44
    selected = [];
    const overflow: RawQuestion[] = [];

    for (const [lg, weight] of Object.entries(CHAPTER_WEIGHTS)) {
      const pool = allQuestions.filter((q) => q.chapter_lg === lg);
      const target = Math.round(weight * total);
      if (pool.length <= target) {
        selected.push(...pool);
      } else {
        const chosen = sample(pool, target, mulberry32(hashStr(id + lg)));
        const chosenIds = new Set(chosen.map((q) => q.id));
        selected.push(...chosen);
        overflow.push(...pool.filter((q) => !chosenIds.has(q.id)));
      }
    }
    const deficit = total - selected.length;
    if (deficit > 0 && overflow.length > 0) {
      selected.push(...sample(overflow, deficit, mulberry32(hashStr(id + "overflow"))));
    }
    selected = shuffle(selected, rng);
  } else {
    let pool = options.chapterFilter?.length
      ? allQuestions.filter((q) => options.chapterFilter!.includes(q.chapter_lg))
      : [...allQuestions];
    if (options.doShuffle !== false) pool = shuffle(pool, rng);
    if (options.count && options.count < pool.length) pool = pool.slice(0, options.count);
    selected = pool;
  }

  const questions = selected.map((q) => processQuestion(q, id));

  return {
    id,
    mode,
    username: options.username ?? null,
    started_at: new Date().toISOString(),
    finished_at: null,
    duration_s: mode === "exam" ? 75 * 60 : null,
    questions,
    answers: {},
  };
}

// ── Scoring ────────────────────────────────────────────────────────────────

export function scoreAnswer(
  question: Question,
  selected: number[] | Record<string, string>,
  timeSpentS: number
): Answer {
  let score = 0;
  const max_score = 1;
  let correct_count = 0;
  let wrong_count = 0;
  let is_overselected = false;

  if (question.type === "pick") {
    const selectedIds = new Set(selected as number[]);
    const correctIds = new Set(question.choices.filter((c) => c.is_correct).map((c) => c.id));
    is_overselected = selectedIds.size > correctIds.size;
    if (!is_overselected) {
      for (const id of selectedIds) {
        if (correctIds.has(id)) correct_count++;
        else wrong_count++;
      }
      score = correctIds.size > 0 ? Math.max(0, correct_count - wrong_count) / correctIds.size : 0;
    }
  } else {
    const selectedMap = selected as Record<string, string>;
    for (const c of question.choices) {
      const userCat = selectedMap[String(c.id)];
      const isCorrect = userCat === c.category_label || userCat === c.category_label_en;
      if (isCorrect) correct_count++;
      else if (userCat !== undefined) wrong_count++;
    }
    score = question.choices.length > 0 ? correct_count / question.choices.length : 0;
  }

  return { selected, score, max_score, correct_count, wrong_count, is_overselected, time_spent_s: timeSpentS };
}

// ── Persistence ────────────────────────────────────────────────────────────

export function saveAttempt(attempt: Attempt): void {
  sessionStorage.setItem(`attempt-${attempt.id}`, JSON.stringify(attempt));
}

export function loadAttempt(id: string): Attempt | null {
  const raw = sessionStorage.getItem(`attempt-${id}`);
  return raw ? (JSON.parse(raw) as Attempt) : null;
}

// ── Question loader ────────────────────────────────────────────────────────

let _cache: RawQuestion[] | null = null;

export async function loadQuestions(): Promise<RawQuestion[]> {
  if (_cache) return _cache;
  const res = await fetch("questions.json");
  if (!res.ok) throw new Error(`Failed to load questions: ${res.status}`);
  _cache = (await res.json()) as RawQuestion[];
  return _cache;
}

// ── Chapter stats helper ───────────────────────────────────────────────────

export interface ChapterInfo {
  code: string;
  name: string;
  count: number;
}

export function getChapterStats(questions: RawQuestion[]): ChapterInfo[] {
  return Object.entries(CHAPTER_NAMES)
    .map(([code, name]) => ({
      code,
      name,
      count: questions.filter((q) => q.chapter_lg === code).length,
    }))
    .filter((ch) => ch.count > 0);
}
