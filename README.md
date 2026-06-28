# iSAQB Foundation Prep

Unofficial exam practice application — 287 questions across 5 learning goals, runs entirely in the browser with no server required.

![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-deployed-brightgreen)
![React 18](https://img.shields.io/badge/React-18-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Contributions welcome](https://img.shields.io/badge/contributions-welcome-brightgreen)

> **Disclaimer.** This is an independently developed practice tool and is not affiliated with, endorsed by, or approved by iSAQB GmbH or the International Software Architecture Qualification Board (iSAQB®). All trademarks, including iSAQB® and CPSA®, belong to their respective owners. The 250 practice questions are independently authored for study purposes. The 37 official mock exam questions are reproduced from publicly available iSAQB mock exams.

---

## Live App

> **https://roxyrmr.github.io/isaqb-foundation-prep/**

Click the link to start an exam or study session directly in your browser — no login, no installation.

---

## Overview

A practice application for the iSAQB Certified Professional for Software Architecture — Foundation Level (CPSA-F) exam. It ships with **287 questions** covering all six CPSA-F 2025.1 learning goal chapters:

- **250 independently authored questions** written to match the style and difficulty of the official exam
- **37 questions from publicly available iSAQB official mock exams** (mock exams 2017-13, 2020-04, and 2021-05, published by iSAQB GmbH)

The application is **fully static** — all exam logic, question sampling, scoring, and state management run in the browser. No backend or server is needed to use it.

A FastAPI backend and SQLite database are included for local development and question editing.

---

## Exam Modes

| Feature | Exam | Study |
|---|---|---|
| Question count | 32–44, weighted | 1 – all available |
| Chapter filter | All (auto-weighted) | User-selectable |
| Per-question feedback | No | Yes |
| Explanation shown | Results page only | Immediately |
| Shuffle | Always | Configurable |
| Language | DE / EN toggle | DE / EN toggle |

---

## Deployment (GitHub Pages)

A GitHub Actions workflow is included and triggers automatically on every push to `main`.

### First-time setup

1. Fork or clone the repository and push it to GitHub under your account.
2. In the repository on GitHub, go to **Settings → Pages**. Under *Source*, select branch `gh-pages` and folder `/`, then click **Save**.
3. Push any commit to `main` (or trigger manually via **Actions → Deploy to GitHub Pages → Run workflow**). The site goes live in about a minute.

> **Note:** GitHub Actions needs write permission to publish the `gh-pages` branch. Check **Settings → Actions → General → Workflow permissions** is set to *Read and write permissions*.

### Manual build

```bash
cd frontend
npm install
npm run build
# Static output in frontend/dist/
```

---

## Running Locally

### Frontend only (recommended)

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. Questions are loaded from `frontend/public/questions.json`.

### With backend

**Terminal 1 — Backend**
```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

**Terminal 2 — Frontend**
```bash
cd frontend
npm run dev
```

### Requirements

- Node.js ≥ 18 and npm (frontend — required)
- Python ≥ 3.11 and [uv](https://docs.astral.sh/uv/) (backend — optional, for question editing only)

---

## Question Types

**`pick` — Multi-select**  
The question specifies how many answers are correct ("Which TWO…"). Scoring is partial: one point per correct selection minus one point per incorrect selection, floored at zero. Selecting more options than the correct count scores zero.

**`category` — Classification**  
Each option must be assigned to one of two or more categories. One point per correctly classified item.

---

## Adding Questions

Questions are maintained in `backend/app/seeds/bundled_questions.py`. After editing, regenerate the JSON bundle:

```bash
cd backend
python -c "
import json, sys
sys.path.insert(0, '.')
from app.seeds.bundled_questions import QUESTIONS
with open('../frontend/public/questions.json', 'w') as f:
    json.dump(QUESTIONS, f, ensure_ascii=False, indent=2)
print(f'{len(QUESTIONS)} questions written.')
"
```

Commit both `bundled_questions.py` and `frontend/public/questions.json`, then push to `main`.

---

## Project Layout

```
isaqb-exam-python/
├── .github/
│   └── workflows/
│       └── deploy.yml               # GitHub Pages deploy on push to main
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI app
│   │   ├── seeds/
│   │   │   └── bundled_questions.py # source of truth — 287 questions (250 authored + 37 official mock)
│   │   ├── routers/                 # questions, exam, admin endpoints
│   │   └── services/                # scoring, shuffle helpers
│   └── pyproject.toml
└── frontend/
    ├── public/
    │   └── questions.json           # browser-loaded question bundle
    ├── src/
    │   ├── engine.ts                # exam logic — sampling, scoring, state
    │   ├── pages/                   # StartPage, ExamPage, ResultsPage
    │   ├── components/              # PickQuestion, CategoryQuestion
    │   └── context/                 # LangContext (DE / EN)
    └── vite.config.ts
```

---

*This project is not affiliated with iSAQB GmbH. iSAQB® and CPSA® are registered trademarks of the International Software Architecture Qualification Board. The 250 practice questions are independently authored. The 37 official mock exam questions are reproduced from publicly available iSAQB mock exams published by iSAQB GmbH.*
