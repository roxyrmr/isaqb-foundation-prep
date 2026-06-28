.PHONY: generate dev-frontend dev-backend seed help

## Regenerate questions.json from bundled_questions.py (run this after editing question content)
generate:
	cd backend && uv run python -c "\
	import json, sys; sys.path.insert(0, '.'); \
	from app.seeds.bundled_questions import BUNDLED_QUESTIONS; \
	json.dump(BUNDLED_QUESTIONS, open('../frontend/public/questions.json', 'w'), ensure_ascii=False, indent=2)"
	@echo "Generated frontend/public/questions.json"

## Start the frontend dev server (static site — no backend required)
dev-frontend:
	cd frontend && npm run dev

## Start the backend API server (local development only — not used in production)
dev-backend:
	cd backend && uv run uvicorn app.main:app --reload

## Seed the local SQLite database from bundled_questions.py
seed:
	cd backend && uv run python -c "\
	from app.database import SessionLocal, engine; \
	from app import models; \
	models.Base.metadata.create_all(bind=engine); \
	from app.services.seeder import seed_bundled; \
	db = SessionLocal(); seed_bundled(db); db.close(); print('Done')"

help:
	@grep -E '^##' Makefile | sed 's/## //'
