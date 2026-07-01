# Architecture Documentation

> arc42-style views for the iSAQB Foundation Prep application.

---

## 1. Context View

The system is a **fully static, browser-based SPA**. All exam logic runs client-side — there is no API call during an exam session.

```
                        ┌─────────────────────────────────┐
                        │   iSAQB Foundation Prep (SPA)   │
                        │                                 │
 Exam Candidate ────────►  Start → Exam → Results        │
 (browser)              │  287 questions · DE/EN toggle   │
                        └────────────┬────────────────────┘
                                     │ static assets (HTML/JS/JSON)
                        ┌────────────▼────────────────────┐
                        │       GitHub Pages               │
                        │  roxyrmr.github.io/             │
                        │  isaqb-foundation-prep/          │
                        └────────────┬────────────────────┘
                                     │ deploy on push to main
                        ┌────────────▼────────────────────┐
                        │     GitHub Actions (CI/CD)       │
                        │  build → publish → gh-pages      │
                        └─────────────────────────────────┘

                        ┌─────────────────────────────────┐
                        │   Cloudflare Web Analytics       │
                        │  cookieless · GDPR-compliant     │
                        │  beacon fires on every page load │
                        └─────────────────────────────────┘

                        ┌─────────────────────────────────┐
                        │   FastAPI Backend  (optional)    │
                        │  question admin only · not       │
                        │  required for exam functionality │
                        └─────────────────────────────────┘
```

### External Actors

| Actor | Role |
|---|---|
| Exam Candidate | Opens the live app, selects mode, takes exam, views results |
| GitHub | Hosts source code and serves the built SPA via GitHub Pages |
| Cloudflare | Provides cookieless, GDPR-compliant page-view analytics |
| iSAQB (indirect) | Source of the 37 official mock exam questions (static, bundled) |

### Key Constraints
- No user login, no server-side state — everything lives in `localStorage`
- Must run as a static site (GitHub Pages constraint)
- Questions are bundled at build time — no runtime API calls to fetch questions

---

## 2. Building Block View

### Level 1 — System Decomposition

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser SPA                             │
│                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │  StartPage  │  │   ExamPage   │  │   ResultsPage     │  │
│  │             │  │              │  │                   │  │
│  │ mode select │  │ timer        │  │ score ring        │  │
│  │ chapter     │  │ navigator    │  │ chapter breakdown │  │
│  │ filter      │  │ flag button  │  │ question review   │  │
│  │ lang toggle │  │ lang toggle  │  │ lang toggle       │  │
│  └──────┬──────┘  └──────┬───────┘  └────────┬──────────┘  │
│         │                │                    │             │
│         └────────────────┼────────────────────┘             │
│                          │                                  │
│              ┌───────────▼───────────┐                      │
│              │      engine.ts        │                      │
│              │                       │                      │
│              │  loadQuestions()      │                      │
│              │  createAttempt()      │                      │
│              │  scoreAnswer()        │                      │
│              │  saveAttempt()        │                      │
│              │  loadAttempt()        │                      │
│              │  getChapterStats()    │                      │
│              └───────────┬───────────┘                      │
│                          │                                  │
│         ┌────────────────┼────────────────┐                 │
│         │                │                │                 │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌─────▼──────┐         │
│  │ LangContext │  │  localStorage│  │questions   │         │
│  │  (DE/EN)   │  │  (attempts,  │  │  .json     │         │
│  │  i18n.ts   │  │   lang pref) │  │ (287 Qs)   │         │
│  └─────────────┘  └─────────────┘  └────────────┘         │
│                                                             │
│  ┌──────────────────┐  ┌──────────────────────────────┐    │
│  │  PickQuestion    │  │  CategoryQuestion             │    │
│  │  (single/multi   │  │  (classification table with  │    │
│  │   choice with    │  │   radio-style cell buttons)  │    │
│  │   A/B/C/D labels)│  └──────────────────────────────┘    │
│  └──────────────────┘                                       │
└─────────────────────────────────────────────────────────────┘
```

### Level 2 — Component Responsibilities

#### Pages

| Component | Responsibility |
|---|---|
| `StartPage` | Mode selection (exam/study), chapter filter, question limit, shuffle toggle, username, language toggle. Calls `createAttempt()` and navigates to `/exam/:id`. |
| `ExamPage` | Renders current question, manages countdown timer, question navigator, flag state, per-question submission (exam) or check-answer flow (study). Navigates to `/results/:id` on finish or timeout. |
| `ResultsPage` | Loads completed attempt, computes score and pass/fail (≥ 60%), renders score ring, per-chapter breakdown bars, expandable question review, retake and new session actions. |

#### Shared Components

| Component | Responsibility |
|---|---|
| `PickQuestion` | Renders single/multi-select choices with A/B/C/D labels. Colour states: indigo (selected), emerald (correct), red (wrong). Enforces selection limit for multi-select. |
| `CategoryQuestion` | Renders a classification table. Each statement row has one radio-style button per category. Shows correct/wrong highlight on reveal. |

#### Core Modules

| Module | Responsibility |
|---|---|
| `engine.ts` | Single source of truth for data and logic. Fetches and caches `questions.json`, applies chapter-weighted sampling for exam mode, scores `pick` and `category` answers (partial credit), persists attempts to `localStorage`. |
| `i18n.ts` | Holds all DE/EN string pairs. Exports `t(key, lang)`, `tSelectN(n, lang)`, `tPartial(right, wrong, lang)`, `tIncorrect(right, wrong, lang)`. No runtime dependency — pure lookup. |
| `LangContext` | React context that holds the active language (`"de"` \| `"en"`), persists to `localStorage` under key `isaqb-lang`, exposes `toggle()`. Default: `"en"`. |

#### Data

| Asset | Description |
|---|---|
| `public/questions.json` | 287 questions. Each has `id`, `type` (`pick`\|`category`), `chapter_lg`, `text` (DE), `text_en` (EN), `choices[]`, `correct_count`, `explanation`. |
| `localStorage` | Stores serialised `Attempt` objects (questions, answers, scores, timestamps) and `isaqb-lang` preference. No server involved. |

---

## 3. Runtime View

### 3.1 Exam Mode — Happy Path

```
User          Browser / React        engine.ts          localStorage
 │                  │                    │                    │
 │  open app        │                    │                    │
 │─────────────────►│  fetch questions   │                    │
 │                  │───────────────────►│                    │
 │                  │◄── 287 questions ──│                    │
 │                  │                    │                    │
 │  select Exam     │                    │                    │
 │  click Start     │  createAttempt()   │                    │
 │─────────────────►│───────────────────►│                    │
 │                  │  sample by chapter │                    │
 │                  │  weight (32–44 Qs) │                    │
 │                  │◄── Attempt obj ────│                    │
 │                  │  saveAttempt()     │                    │
 │                  │───────────────────────────────────────►│
 │                  │  navigate /exam/:id│                    │
 │                  │                    │                    │
 │  answer Q1       │                    │                    │
 │─────────────────►│                    │                    │
 │  click Next      │  scoreAnswer()     │                    │
 │─────────────────►│───────────────────►│                    │
 │                  │◄── Answer (score) ─│                    │
 │                  │  saveAttempt()     │                    │
 │                  │───────────────────────────────────────►│
 │                  │  … repeat for each question …           │
 │                  │                    │                    │
 │  click Finish    │                    │                    │
 │─────────────────►│  mark finished_at  │                    │
 │                  │  saveAttempt()     │                    │
 │                  │───────────────────────────────────────►│
 │                  │  navigate /results/:id                  │
 │                  │                    │                    │
 │                  │  loadAttempt()     │                    │
 │                  │◄──────────────────────────────────────►│
 │                  │  compute % score   │                    │
 │                  │  passed = % ≥ 60   │                    │
 │◄── results page ─│                    │                    │
```

### 3.2 Timer Expiry (Exam Mode)

```
ExamPage mounts
    │
    ├── setInterval (every 1 s)
    │       │
    │       └── remaining = duration_s − elapsed
    │                │
    │                ├── remaining > 10 min  → timer: slate
    │                ├── remaining ≤ 10 min  → timer: amber
    │                └── remaining ≤  5 min  → timer: red
    │
    └── useEffect [remaining]
            │
            └── remaining ≤ 0 && !isStudy
                    │
                    └── saveAttempt(finished_at) → navigate /results/:id
```

### 3.3 Language Toggle

```
User clicks 🇩🇪 DE / 🇬🇧 EN button
        │
        ▼
LangContext.toggle()
        │
        ├── setLang("de" | "en")
        └── localStorage.setItem("isaqb-lang", lang)
                │
                ▼
        React re-renders all consumers
                │
        ┌───────┴────────────────────────┐
        │                                │
  Question text                   UI strings
  lang==="en" && text_en           t(key, lang)
    ? text_en : text               tSelectN / tPartial
        │                                │
  (question content)             (buttons, labels,
  switches language               badges, headings)
```

### 3.4 Scoring Logic

**`pick` (single / multi-select)**
```
score = correct_selections - wrong_selections
score = max(0, score)
if selected.length > correct_count → is_overselected = true, score = 0
max_score = correct_count
```

**`category` (classification)**
```
for each choice:
  score += 1 if assigned_category === correct_category
max_score = choices.length
```

---

## 4. Deployment Pipeline

```
git push → main
       │
       ▼
GitHub Actions (deploy.yml)
       │
       ├── actions/checkout@v4
       ├── actions/setup-node@v4  (Node 20)
       ├── npm install  (frontend/)
       ├── npm run build  → frontend/dist/
       │
       └── peaceiris/actions-gh-pages@v4
               │
               └── push frontend/dist/ → gh-pages branch
                           │
                           ▼
                   GitHub Pages serves
                   roxyrmr.github.io/isaqb-foundation-prep/
```

---

*Architecture documented using arc42 views (Context, Building Block, Runtime).*
