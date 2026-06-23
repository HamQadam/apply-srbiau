# Current State Audit

This audit is based on the repository as inspected on 2026-06-23.

## What Exists

### Backend

The backend is a FastAPI app with SQLModel and PostgreSQL support. It has route modules for auth, tracker, universities, courses, Ghadam wallet, matching, applicants, applications, documents, activities, languages, subscriptions, and applicant onboarding.

The main router currently includes only auth, tracker, universities, courses, ghadam, and matching. Several API files exist but are not currently mounted in `app/api/v1/router.py`.

### Frontend

The frontend is a React/Vite app with a public homepage, public Explore page, login, onboarding, protected dashboard, add program, program detail, recommendations, settings, Persian and English locale files, and RTL/LTR language infrastructure.

### Data Pipeline

The crawler framework exists and supports DAAD and Study in NL, normalized `universities` and `courses` payloads, crawler stats and failure reporting, and Docker Compose crawler profiles.

The postprocess service supports deadline note parsing, deterministic parsing first, optional local LLM fallback, and row locking for parallel safety.

### Deployment

Docker Compose defines services for API, frontend, PostgreSQL, Nginx, DAAD crawler, Study in NL crawler, and deadline refiner.

The Makefile provides shortcuts for build, run, logs, psql, crawlers, backend/frontend rebuilds, and deadline postprocess.

## Direction Is Good

The repository already points toward the intended product:

- `courses` stores important planning fields like tuition, deadline, language, requirements, scholarship, and URLs.
- `tracked_programs` supports private application planning.
- `matching_profile` and `MatchingService` support recommendations.
- `applicants` and `applications` begin the experience-sharing domain.
- `ghadam` models suggest a contribution/unlock economy.
- i18n is already implemented, including Persian.

The main missing piece is consolidation: the current code needs clearer domain boundaries, cleaner schemas, mounted routes, data provenance, and a prioritized implementation path.

## Key Gaps and Risks

### 1. Some Existing Backend Modules Are Not Mounted

`backend/app/api/v1/router.py` mounts only six routers. Other existing modules, such as applicants, applicant onboarding, applications, documents, languages, activities, subscriptions, and wallet, appear unused by the public API unless mounted elsewhere.

Impact: features may exist in code but be unreachable from the frontend.

Recommended action: decide which modules belong in the active API and mount them intentionally.

### 2. Applicant Model Appears Internally Inconsistent

`backend/app/models/applicant.py` references names such as `BaseModel`, `Literal`, `List`, `WorkExpIn`, and `LanguageTestIn` without visible imports or definitions in the inspected file section.

Impact: backend import/startup may fail, depending on import path and test coverage.

Recommended action: run backend import/tests, fix schema definitions, and add tests around applicant onboarding.

### 3. Relationship Mismatch Risk

`Application` declares `university: Relationship(back_populates="applications")`, but the inspected `University` model only showed `courses`. If `University.applications` is not declared elsewhere, model configuration can fail.

Impact: ORM relationship errors at import/runtime.

Recommended action: either add `applications` relationship to `University` or remove/adjust the back_populates pair.

### 4. Configuration Duplication

`backend/app/config.py` defines `debug_otp` twice, once defaulting to `False` and later defaulting to `True`.

Impact: confusing environment behavior and possible unsafe defaults in production.

Recommended action: keep one definition, default it to `False`, and make local debug explicit.

### 5. Compose Volume Name Mismatch

Crawler services mount `crawler-state:/state`, but the `volumes:` block defines `daad_state:` and not `crawler-state:`.

Impact: Compose may fail validation or create unexpected behavior depending on Docker Compose handling.

Recommended action: define `crawler-state:` or update services to use the declared volume.

### 6. README Was Not Yet a Useful Onboarding Document

The previous root README mixed a crawler source list and UI TODOs. It did not explain what the product is, how the services fit together, how to run it, where to start development, or what is implemented versus planned.

Recommended action: keep README short and link to the documentation set.

### 7. Experience Sharing Needs a Clear Contract

There are models for applicants and applications, but the product contract is not yet clear:

- What is public?
- What is anonymized?
- What requires coins?
- What is moderated?
- What can be linked to a course/university?

Impact: privacy and product confusion.

Recommended action: write and implement a formal experience schema and moderation workflow before encouraging real users to publish.

### 8. Data Provenance Is Too Thin

The course model has URLs and verification fields, but source identity and field-level provenance are not yet first-class.

Impact: users cannot judge whether a tuition/deadline/requirement is trustworthy.

Recommended action: add source metadata and freshness information to crawled entities.

## Recommended Near-Term Focus

1. Make the app reliably start and test.
2. Fix obvious schema/config/compose issues.
3. Keep the root README as the entry point.
4. Mount or remove inactive API modules intentionally.
5. Complete the tracker and recommendation loop.
6. Add provenance to crawler output.
7. Design and implement experience sharing with moderation and consent.

## Questions To Resolve

- Is Ghadam the final public name?
- Should the first launch target only master's applicants or bachelor/master together?
- Which countries are first-class for MVP: Germany and Netherlands only, or Germany/Netherlands/Sweden?
- Should experience unlocks use only Ghadam coins at first, or remain free until content supply grows?
- What level of manual admin verification is acceptable before public launch?
