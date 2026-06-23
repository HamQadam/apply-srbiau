# Implementation Tasks

This file turns the proposal into concrete engineering work. Keep it updated as the product changes.

## Phase 0: Stabilize the Existing App

- [x] Run backend import/startup and fix model import errors.
- [x] Fix `backend/app/models/applicant.py` missing imports or undefined schema names.
- [x] Fix `Application` to `University` relationship consistency.
- [x] Remove duplicate `debug_otp` definition in `backend/app/config.py`.
- [x] Fix crawler state volume mismatch in `deploy/compose.yml`.
- [x] Decide which existing API modules should be mounted in `app/api/v1/router.py`.
- [ ] Add smoke tests for app startup, health endpoint, and mounted routes.
- [ ] Add frontend build check to normal development workflow.

## Phase 1: Documentation and Developer Onboarding

- [x] Add architecture documentation.
- [x] Add product proposal.
- [x] Add current-state audit.
- [x] Add task roadmap.
- [x] Add LLM onboarding context.
- [x] Replace or revise root README with current run instructions and links.
- [ ] Add `.env.example` comments for all required variables.
- [ ] Document local setup for backend, frontend, crawlers, and postprocess.

## Phase 2: Programme Catalogue Quality

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

- [ ] Make Persian the default product language for Iranian users.
- [ ] Audit all core pages for RTL layout issues.
- [ ] Improve Explore filters for country, field, degree, tuition, deadline, and language.
- [ ] Show selected filter values on filter buttons.
- [ ] Add clear empty and too-many-results states.
- [ ] Add source/freshness display on program cards or detail pages.
- [ ] Add course detail page if not already available outside tracked programs.

## Phase 4: Recommendation Loop

- [ ] Define the matching profile schema as a typed backend model instead of anonymous JSON only.
- [ ] Add frontend explanations for match score reasons and warnings.
- [ ] Add max result thresholds and preference refinement prompts.
- [ ] Add support for Iranian GPA scales more explicitly.
- [ ] Add budget currency conversion strategy.
- [ ] Add tests for match scoring cases.
- [ ] Persist recommendation snapshots when a user adds a program to tracker.

## Phase 5: Tracker Quality

- [ ] Add confirmation modal for destructive actions.
- [ ] Improve document checklist required labels.
- [ ] Make empty date fields actionable.
- [ ] Improve deadline warning color logic.
- [ ] Add reminders architecture for upcoming deadlines.
- [ ] Add export or printable application plan.
- [ ] Add richer notes categories if users actually need them.

## Phase 6: Experience Sharing

- [ ] Define public experience schema.
- [ ] Decide visibility rules: private, anonymized, public.
- [ ] Build experience submission flow for applicants after results.
- [ ] Link experiences to university and course where possible.
- [ ] Support custom university/course where no catalogue match exists.
- [ ] Add moderation status: draft, submitted, approved, rejected, hidden.
- [ ] Add admin review page.
- [ ] Add PII warning before publish.
- [ ] Add public experience browsing and filtering.
- [ ] Add full-profile unlock rules if using Ghadam coins.

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
