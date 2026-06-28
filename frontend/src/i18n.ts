export type Lang = "de" | "en";

const strings = {
  // toggle
  switchLang:        { de: "🇬🇧 EN",              en: "🇩🇪 DE" },

  // start page
  certPractice:      { de: "iSAQB Zertifizierungspraxis", en: "iSAQB Certification Practice" },
  chooseModeLabel:   { de: "Modus wählen",          en: "Choose your mode" },
  examModeTitle:     { de: "Prüfungsmodus",          en: "Exam Mode" },
  studyModeTitle:    { de: "Lernmodus",              en: "Study Mode" },
  examModeDesc:      { de: "Zeitgesteuerte Fragen entsprechend der echten CPSA-F-Verteilung. Ergebnisse am Ende.", en: "Timed, weighted questions matching the real CPSA-F distribution. Results at the end." },
  studyModeDesc:     { de: "Themen wählen, sofortiges Feedback und Erklärungen nach jeder Frage.", en: "Pick topics, get instant feedback and explanations after each question." },
  examFormatLabel:   { de: "Prüfungsformat",         en: "Exam Format" },
  timeLimitLabel:    { de: "Zeitlimit",              en: "Time Limit" },
  questionsLabel:    { de: "Fragen",                 en: "Questions" },
  passThresholdLabel:{ de: "Bestehensgrenze",        en: "Pass Threshold" },
  topicsLabel:       { de: "Themen",                 en: "Topics" },
  leaveEmpty:        { de: "(leer = alle)",          en: "(leave empty for all)" },
  qLimitLabel:       { de: "Fragenanzahl",           en: "Question Limit" },
  shuffleLabel:      { de: "Reihenfolge mischen",    en: "Shuffle order" },
  usernameLabel:     { de: "Benutzername",           en: "Username" },
  optional:          { de: "(optional)",             en: "(optional)" },
  yourName:          { de: "Ihr Name",               en: "Your name" },
  startExam:         { de: "Prüfung starten",        en: "Start Exam" },
  startStudy:        { de: "Lernsitzung starten",    en: "Start Study Session" },
  loadingQ:          { de: "Fragen laden…",          en: "Loading questions…" },
  starting:          { de: "Startet…",               en: "Starting…" },

  // exam page
  examBadge:         { de: "PRÜFUNG",               en: "EXAM MODE" },
  studyBadge:        { de: "LERNEN",                en: "STUDY" },
  multiChoice:       { de: "Mehrfachauswahl",       en: "Multiple Choice" },
  singleChoice:      { de: "Einzelauswahl",         en: "Single Choice" },
  categoryType:      { de: "Kategoriezuordnung",    en: "Category Assignment" },
  correctWord:       { de: "richtig",               en: "correct" },
  prev:              { de: "← Zurück",              en: "← Previous" },
  next:              { de: "Weiter →",              en: "Next →" },
  checkAnswer:       { de: "Antwort prüfen",        en: "Check Answer" },
  finishExam:        { de: "Prüfung beenden",       en: "Finish Exam" },
  finish:            { de: "Beenden",               en: "Finish" },
  seeResults:        { de: "Ergebnisse ansehen",    en: "See Results" },
  flagLabel:         { de: "Markieren",             en: "Flag" },
  flaggedLabel:      { de: "Markiert",              en: "Flagged" },
  answeredLabel:     { de: "Beantwortet",           en: "Answered" },
  notAnsweredLabel:  { de: "Offen",                 en: "Not answered" },
  selectOneLabel:    { de: "Eine Antwort wählen",   en: "Select one answer" },
  assignLabel:       { de: "Ordnen Sie jede Aussage der richtigen Kategorie zu.", en: "Assign each statement to the correct category." },
  overSelected:      { de: "Zu viele Optionen — Punktzahl ist 0.", en: "Over-selection: more options selected than correct answers — score is 0." },
  correctFeedback:   { de: "Richtig!",              en: "Correct!" },

  // results
  passedLabel:       { de: "BESTANDEN",             en: "PASSED" },
  failedLabel:       { de: "NICHT BESTANDEN",       en: "FAILED" },
  thresholdNote:     { de: "iSAQB Bestehensgrenze: 60%", en: "iSAQB pass threshold: 60%" },
  chapterBreakdown:  { de: "Kapitelübersicht",      en: "Chapter Breakdown" },
  qReview:           { de: "Fragenübersicht",       en: "Question Review" },
  retakeSame:        { de: "Gleiche Fragen wiederholen", en: "Retake Same Questions" },
  newSession:        { de: "Neue Sitzung",          en: "New Session" },
} as const;

export type TKey = keyof typeof strings;

export function t(key: TKey, lang: Lang): string {
  return strings[key][lang];
}

export function tSelectN(n: number, lang: Lang): string {
  return lang === "de" ? `${n} Antworten wählen` : `Select ${n} correct answers`;
}

export function tPartial(right: number, wrong: number, lang: Lang): string {
  return lang === "de"
    ? `Teilweise: ${right} richtig, ${wrong} falsch.`
    : `Partial credit: ${right} correct, ${wrong} wrong.`;
}

export function tIncorrect(right: number, wrong: number, lang: Lang): string {
  return lang === "de"
    ? `Falsch: ${right} richtig, ${wrong} falsch.`
    : `Incorrect: ${right} correct, ${wrong} wrong.`;
}
