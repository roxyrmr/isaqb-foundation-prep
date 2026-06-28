# Contributing to iSAQB Foundation Prep

Thanks for helping improve this resource. Contributions of all kinds are welcome — new questions, bug fixes, translations, and UI improvements.

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

## Deployment (GitHub Pages)

A GitHub Actions workflow triggers automatically on every push to `main`.

### First-time setup

1. Fork or clone the repository and push it to GitHub under your account.
2. Go to **Settings → Pages**. Under *Source*, select branch `gh-pages` and folder `/`, then click **Save**.
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

## Ways to Contribute

### 1. Add or improve questions

All questions live in [`backend/app/seeds/bundled_questions.py`](backend/app/seeds/bundled_questions.py). Each entry follows this structure:

```python
{
    "id": "local-lgXX-001",        # unique ID, follow the existing pattern
    "chapter_lg": "LG-03",         # one of LG-01 through LG-05
    "type": "pick",                 # "pick" or "category"
    "difficulty": 2,               # 1=easy, 2=medium, 3=hard
    "text": "German question text",
    "text_en": "English question text",
    "explanation": "Why the answer is correct",
    "choices": [
        {"text": "...", "text_en": "...", "is_correct": True},
        {"text": "...", "text_en": "...", "is_correct": False},
    ]
}
```

After editing, regenerate `questions.json`:

```bash
make generate
```

### 2. Fix a bug or improve the UI

The entire frontend is in [`frontend/src/`](frontend/src/). Run locally with:

```bash
make dev-frontend
# opens at http://localhost:5173
```

### 3. Run the backend locally (optional)

The FastAPI backend is dormant in production (the static site doesn't call it), but you can run it for local development:

```bash
make dev-backend    # starts at http://localhost:8000
make seed           # seeds the local SQLite DB
```

---

## Project Layout

```
isaqb-foundation-prep/
├── .github/
│   └── workflows/
│       └── deploy.yml               # GitHub Pages deploy on push to main
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI app
│   │   ├── seeds/
│   │   │   └── bundled_questions.py # source of truth — 287 questions
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

## Pull Request Checklist

- [ ] If you added questions: run `make generate` and commit the updated `questions.json`
- [ ] If you changed scoring logic: update both `frontend/src/engine.ts` and `backend/app/services/scoring.py`
- [ ] If you changed chapter weights: update both `frontend/src/engine.ts` and `backend/app/routers/constants.py`
- [ ] New questions have both `text` (German) and `text_en` (English) filled in
- [ ] Question IDs follow the existing naming convention (`local-lgXX-NNN` for new questions)

---

## Reporting Issues

Use the GitHub issue templates — there are separate templates for bugs and feature requests.

## Code of Conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md). Be respectful and constructive.
