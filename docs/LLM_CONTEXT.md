# LLM Context

Use this file to quickly orient an AI coding assistant or a new human contributor.

## Project Intent

Ghadam is a Persian-first platform for academic immigration planning. It helps Iranian applicants discover university programs, compare requirements and deadlines, track applications, receive explainable recommendations, and learn from other applicants' shared experiences.

The product is focused on academic migration, not general immigration law.

## Current Repository

- `backend/`: FastAPI, SQLModel, PostgreSQL, Alembic, auth, tracker, catalogue, matching, Ghadam wallet concepts.
- `frontend/`: React, Vite, Tailwind, i18next, Persian/English UI.
- `crawlers/`: async crawler framework with DAAD and Study in NL ingestors.
- `postprocess/`: data cleanup jobs, currently deadline parsing.
- `deploy/`: Docker Compose stack.
- `docs/`: product and architecture context.

## Current Product Loop

1. Crawl official program data.
2. Store universities and courses.
3. Let users browse and filter programs.
4. Let users create a matching profile.
5. Recommend programs with explainable scores.
6. Let users track selected programs.
7. Eventually let users publish application experiences.

## Important Concepts

- Ghadam coins: internal credit system for rewarding shared experiences and unlocking richer profiles.
- `courses`: the core program catalogue entity.
- `tracked_programs`: a user's private application planning entity.
- `applicants` and `applications`: early shared-experience entities.
- Persian is the primary audience; English is secondary.

## How To Work In This Repo

Before changing code:

1. Read `docs/ARCHITECTURE.md`.
2. Read `docs/CURRENT_STATE.md`.
3. Check `docs/TASKS.md` for the current phase.
4. Inspect the relevant existing files and follow local patterns.

When adding backend features:

- Keep route modules under `backend/app/api/v1/`.
- Keep business logic in `backend/app/services/` when it is not simple CRUD.
- Keep models and schemas in `backend/app/models/`, unless the project later splits schemas.
- Add or update Alembic migrations for database changes.
- Add tests for behavior that affects matching, auth, tracking, or public data.

When adding frontend features:

- Use existing route/page structure.
- Add text to both `frontend/src/locales/fa.json` and `frontend/src/locales/en.json`.
- Test RTL behavior.
- Prefer dense, practical UI for planning workflows over marketing-style pages.

When adding crawler features:

- Extend `BaseCrawler`.
- Preserve source IDs and source URLs.
- Treat official data as mutable and add freshness/provenance.
- Do not overwrite high-confidence structured values with lower-confidence parses.

## Known Risks To Check First

- `backend/app/models/applicant.py` may have undefined imports/names.
- `Application` and `University` relationship definitions may be inconsistent.
- `debug_otp` is duplicated in backend config.
- Some API modules exist but are not mounted in `app/api/v1/router.py`.
- `deploy/compose.yml` references `crawler-state` but the volumes block does not define it.

## Product Rules

- Always link back to official sources when showing crawled data.
- Do not imply legal certainty.
- Keep recommendations explainable.
- Make user consent explicit before publishing experience data.
- Do not expose personal applicant data by default.
