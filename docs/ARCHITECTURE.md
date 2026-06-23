# Ghadam Architecture

Ghadam is an academic immigration planning platform for Persian-speaking applicants, with English support. The product combines verified program data, personal application planning, recommendations, and shared applicant experiences.

## Current System Shape

The repository is split into five main areas:

| Area | Path | Role |
| --- | --- | --- |
| Frontend | `frontend/` | React/Vite web app with Persian and English i18n, onboarding, dashboard, exploration, recommendations, and settings pages. |
| API | `backend/` | FastAPI service using SQLModel, PostgreSQL, JWT auth, Google auth, OTP auth, tracker APIs, matching APIs, university/course APIs, and Ghadam wallet concepts. |
| Crawlers | `crawlers/` | Async crawler framework and source-specific ingestors for DAAD and Study in NL. |
| Postprocess | `postprocess/` | Rules-first data cleanup jobs, currently focused on parsing deadline notes into structured deadline columns. |
| Deployment | `deploy/` | Docker Compose stack for API, frontend, PostgreSQL, Nginx, crawlers, and postprocess jobs. |

## Product Domains

### Program Catalogue

The catalogue is built around:

- `universities`: institution identity, country, city, website, rankings, type, metadata, and location.
- `courses`: academic programs with degree level, field, teaching language, duration, tuition, deadlines, requirements, scholarship metadata, and source links.
- `course_language_requirements`: language test requirements connected to a course.

The crawler pipeline writes into this domain. The user-facing Explore and Recommendations screens read from it.

### Applicant Planning

The planning domain helps users decide where to apply and track execution:

- `users`: authentication, onboarding state, settings, matching profile, and Ghadam balance.
- `tracked_programs`: the user's private application list. A tracked program can link to a known `course` or be a custom manual entry.
- `document_checklist` and `notes_entries`: JSON fields on `tracked_programs` for practical application preparation.

This is already aligned with the user's goal: a portal for planning university applications.

### Recommendations

The matching service scores courses against a user's matching profile. It currently considers preferred fields, countries, budget, degree level, teaching language, rankings, scholarships, GRE/GMAT/GPA warnings, and deadline warnings.

This is intentionally explainable. Recommendation UI should show both the score and reasons/warnings, because Iranian applicants need to trust why a program is suggested.

### Experience Sharing

The repository has early models for a social/experience layer:

- `applicants`: public or anonymized academic profiles.
- `applications`: historical application outcomes and notes from applicants.
- `documents`, `activities`, `language_credentials`, `subscriptions`, and `ghadam` models: support paid access, profile richness, and the Ghadam coin economy.

This domain is not yet cleanly connected to the main tracker and course catalogue. The target architecture should treat shared experiences as structured stories linked to universities, courses, countries, and outcomes.

## Data Flow

```text
Official source websites
        |
        v
crawlers/
  BaseCrawler.fetch_items()
  BaseCrawler.transform()
        |
        v
universities + courses tables
        |
        v
postprocess/
  deadline parser
  future tuition/requirements normalizers
        |
        v
backend FastAPI
        |
        v
frontend React app
  Explore
  Recommendations
  Dashboard
  Program Detail
```

For shared experiences:

```text
Applicant/user submits journey
        |
        v
moderation + consent + anonymization
        |
        v
applicant profile + applications + documents/language/activity summaries
        |
        v
searchable experience pages and paid profile unlocks
```

## Backend Architecture

The backend currently uses FastAPI and SQLModel. Important modules:

- `app/main.py`: FastAPI app, health endpoint, CORS, route mounting.
- `app/api/v1/router.py`: v1 route aggregation.
- `app/models/`: database models and read/create/update schemas.
- `app/services/`: auth, Google OAuth, course access, file storage, Ghadam wallet, and matching.
- `app/tools/seed/`: fake seed data.
- `alembic/`: database migrations.

Recommended API boundaries:

- `catalogue`: universities, courses, language requirements, source verification.
- `planning`: tracked programs, notes, document checklists, reminders.
- `profiles`: applicant profile, education, language tests, work experience.
- `experiences`: public journey stories, outcomes, interviews, tips, moderation.
- `recommendations`: matching profile, ranked programs, explanation.
- `wallet`: Ghadam balance, unlocks, rewards.
- `auth`: OTP, Google, sessions.

## Frontend Architecture

The frontend currently uses React, Vite, Tailwind, React Router, i18next, and Framer Motion.

Important modules:

- `src/App.tsx`: route definitions and protected route wrapper.
- `src/contexts/AuthContext.tsx`: authentication state.
- `src/contexts/LanguageContext.tsx`: language direction and language switching.
- `src/locales/fa.json` and `src/locales/en.json`: Persian and English text.
- `src/pages/Explore/ExplorePage.tsx`: program catalogue browsing.
- `src/pages/Recommendations/RecommendationsPage.tsx`: personalized program ranking.
- `src/pages/Dashboard/`: user planning and program tracking.
- `src/pages/Onboarding/OnboardingPage.tsx`: user setup.

The default product language should be Persian, with English as a secondary setting. UI should continue to support RTL carefully.

## Crawler Architecture

The crawler layer has a good base abstraction:

- `BaseCrawler.fetch_items()`: source-specific pagination and rate limiting.
- `BaseCrawler.transform()`: source-specific raw-to-normalized mapping.
- `CrawlResult`: structured university and course payloads, status, warnings, and errors.
- `CrawlStats`: run-level quality metrics.

Existing sources:

- DAAD for Germany.
- Study in NL for the Netherlands.

Target additions should prioritize official or high-authority sources and keep source provenance. Program data changes frequently, so each course should eventually store source name, source external id, source URL, last crawled time, last verified time, confidence score per field, and raw payload reference or snapshot.

## Postprocess Architecture

Postprocess jobs improve crawler output after ingestion. The current `deadlines` job reads `courses.deadline_notes`, fills missing `deadline_fall` and `deadline_spring`, uses deterministic parsing first, optionally falls back to a local LLM, and does not overwrite existing structured values.

This pattern should be extended for tuition normalization, currency normalization, EU/non-EU fee separation, IELTS/TOEFL/PTE requirement extraction, application requirement extraction, field taxonomy mapping, and source deduplication.

## Deployment Architecture

`deploy/compose.yml` defines `api`, `frontend`, `database`, `nginx`, `daad-crawler`, `studyinnl-crawler`, and `deadline-refiner`.

The current stack is suitable for early development and a small production deployment. Before a public launch, add automated migrations, separate production secrets handling, scheduled crawler jobs, PostgreSQL backup/restore, observability, and moderation/admin tools.

## Architectural Principles

1. Official data first, community data second.
2. Every crawled field should have source provenance.
3. Recommendations must be explainable, not just scored.
4. Persian UX is primary; English is secondary.
5. Shared experiences require consent, anonymization, and moderation.
6. The tracker should work even when catalogue data is incomplete, through custom tracked programs.
7. Data quality is a product feature, not only an engineering concern.
