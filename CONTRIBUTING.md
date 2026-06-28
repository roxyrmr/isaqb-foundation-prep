# Contributing to iSAQB Foundation Prep

Thanks for helping improve this resource. Contributions of all kinds are welcome — new questions, bug fixes, translations, and UI improvements.

## Ways to contribute

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

## Pull request checklist

- [ ] If you added questions: run `make generate` and commit the updated `questions.json`
- [ ] If you changed scoring logic: update both `frontend/src/engine.ts` and `backend/app/services/scoring.py`
- [ ] If you changed chapter weights: update both `frontend/src/engine.ts` and `backend/app/routers/constants.py`
- [ ] New questions have both `text` (German) and `text_en` (English) filled in
- [ ] Question IDs follow the existing naming convention (`local-lgXX-NNN` for new questions)

## Reporting issues

Use the GitHub issue templates — there are separate templates for bugs and feature requests.

## Code of Conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md). Be respectful and constructive.
