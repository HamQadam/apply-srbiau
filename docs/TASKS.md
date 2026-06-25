# Implementation Tasks

This file turns the proposal into concrete engineering work. Keep it updated as the product changes.

## Phase 0: Stabilize the Existing App

- [X] Run backend import/startup and fix model import errors.
- [X] Fix `backend/app/models/applicant.py` missing imports or undefined schema names.
- [X] Fix `Application` to `University` relationship consistency.
- [X] Remove duplicate `debug_otp` definition in `backend/app/config.py`.
- [X] Fix crawler state volume mismatch in `deploy/compose.yml`.
- [X] Decide which existing API modules should be mounted in `app/api/v1/router.py`.
- [ ] Add frontend build check to normal development workflow.

## Phase 1: Documentation and Developer Onboarding

- [X] Add architecture documentation.
- [X] Add product proposal.
- [X] Add current-state audit.
- [X] Add task roadmap.
- [X] Add LLM onboarding context.
- [X] Replace or revise root README with current run instructions and links.
- [X] Add `.env.example` comments for all required variables.
- [X] Document local setup for backend, frontend, crawlers, and postprocess.

## Phase 2: Programme Catalogue Quality

- [X] Introduce two-phase crawl pipeline: raw storage → lexical parse → LLM enrich.
- [X] Add raw_crawl_items table (JSONB) as staging area for all crawled payloads.
- [X] Simplify crawlers to store-only (no transform at crawl time).
- [X] Add Stage-2 parse-raw postprocess job (lexical rules, flags needs_llm).
- [X] Add Stage-3 llm-enrich postprocess job (LiteLLM, provider-agnostic).
- [X] Add litellm dependency; configure via LITELLM_MODEL / LITELLM_API_KEY env vars.
- [ ] Add source metadata fields for universities/courses.
- [ ] Store source external IDs for crawled courses.
- [ ] Add last crawled and last verified timestamps.
- [ ] Add confidence/freshness indicators for tuition, deadlines, and requirements.
- [ ] Normalize country names and field taxonomy.
- [ ] Normalize tuition fields for EU/non-EU/international rates.
- [ ] Normalize language requirements into structured rows.
- [ ] Add source links visibly in frontend course detail views.
- [ ] Add crawler freshness and completeness metrics.

## Phase 3: Persian-First Explore

- [X] Make Persian the default product language for Iranian users.
- [X] Audit all core pages for RTL layout issues.
- [X] Improve Explore filters for country, field, degree, tuition, deadline, and language.
- [X] Show selected filter values on filter buttons.
- [X] Add clear empty and too-many-results states.
- [X] Add source/freshness display on program cards or detail pages.
- [X] Add course detail page if not already available outside tracked programs.

## Phase 4: Recommendation Loop

- [X] Define the matching profile schema as a typed backend model instead of anonymous JSON only.
- [X] Add frontend explanations for match score reasons and warnings.
- [X] Add max result thresholds and preference refinement prompts.
- [X] Add support for Iranian GPA scales more explicitly.
- [X] Add budget currency conversion strategy.
- [X] Add tests for match scoring cases.
- [X] Persist recommendation snapshots when a user adds a program to tracker.

## Phase 5: Tracker Quality

- [X] Add confirmation modal for destructive actions.
- [X] Improve document checklist required labels.
- [X] Make empty date fields actionable.
- [X] Improve deadline warning color logic.
- [X] Add reminders architecture for upcoming deadlines.
- [X] Add export or printable application plan.
- [X] Add richer notes categories if users actually need them.

## Phase 6: Experience Sharing

- [X] Define public experience schema.
- [X] Decide visibility rules: private, anonymized, public.
- [X] Build experience submission flow for applicants after results.
- [X] Link experiences to university and course where possible.
- [X] Support custom university/course where no catalogue match exists.
- [X] Add moderation status: draft, submitted, approved, rejected, hidden.
- [X] Add admin review page.
- [X] Add PII warning before publish.
- [X] Add public experience browsing and filtering.
- [X] Add full-profile unlock rules if using Ghadam coins.

## Phase 7: Country Expansion

- [ ] Add Sweden source plan.
- [ ] Add Finland source plan.
- [ ] Add Denmark source plan.
- [ ] Add France source plan.
- [ ] Add Canada source plan.
- [ ] Add United States source plan.
- [ ] Add ROR-based institution deduplication.
- [ ] Define per-source crawl frequency and rate limits.

## Phase 8: Production Readiness

- [ ] Run Alembic migrations on deployment instead of relying on table creation at startup.
- [ ] Add PostgreSQL backup and restore docs.
- [ ] Add structured logging for API and crawlers.
- [ ] Add error monitoring.
- [ ] Add basic analytics for product metrics.
- [ ] Add admin tooling for crawler status and data quality.
- [ ] Add privacy policy and terms appropriate for user-submitted application stories.
- [ ] Review source website terms before large-scale crawling.

## Subagent-Friendly Work Packages

If using coding subagents later, split work by independent boundaries:

- Backend stabilizer: import errors, model consistency, route mounting, tests.
- Frontend UX pass: Persian RTL, Explore filters, tracker polish.
- Data engineer: crawler provenance, normalization, postprocess jobs.
- Product writer: Persian copy, consent language, experience sharing flows.
- QA engineer: startup/build/test automation and regression checklist.
