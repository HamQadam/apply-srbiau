# Product Proposal

## Working Name

Ghadam: a Persian-first academic immigration planning platform.

## Problem

Iranian students who want to study abroad must collect scattered information from many official university and country websites. They need to compare tuition, deadlines, language requirements, application documents, rankings, scholarships, and real outcomes from similar applicants. Today this work is manual, repetitive, error-prone, and often driven by incomplete Telegram/Instagram advice.

## Target Users

Primary users:

- Iranian bachelor students planning master's applications.
- Iranian master's students planning PhD applications.
- Applicants who need a practical tracker for deadlines, documents, and application status.

Secondary users:

- Accepted/rejected applicants who can share their experience.
- Advisors or mentors who help students choose universities.
- Future international users through English UI support.

## Product Vision

Ghadam should become the place where a Persian-speaking applicant can answer:

- Which countries and universities fit my budget, field, degree, and language profile?
- What are the real deadlines and requirements?
- Which programs should I track as dream, target, and safety options?
- What documents are missing?
- What did similar applicants do, and what happened to them?

## Core Product Pillars

### 1. Program Discovery

Users can search and filter universities and programs by country, city, university, field, degree level, tuition, tuition-free status, deadline, teaching language, scholarship availability, GPA/GRE/GMAT/language requirements, and ranking.

The current codebase already supports much of this through `universities`, `courses`, and Explore.

### 2. Personal Planning

Users can add programs to a private application tracker and manage priority, status, deadlines, checklist items, notes, application portal URL, application ID, and scholarship result.

This is currently represented by `tracked_programs` and the dashboard pages.

### 3. Recommendations

Users create a matching profile and receive scored program suggestions. The score should remain transparent and show why this program fits, what could be risky, which requirements are missing, and whether the deadline is still usable.

The current matching service is a good start, but it needs better normalization and more complete requirement data.

### 4. Shared Experiences

Applicants can publish anonymized or public experiences connected to university, course/program, country, field, degree level, application year, result, scholarship result, interview experience, timeline, documents used, GPA/language/test profile, and practical tips.

This should become the community layer of the product. The existing `applicants`, `applications`, `subscriptions`, and `ghadam` models are the foundation, but the UX and moderation flow still need to be built.

### 5. Ghadam Economy

Ghadam coins can reward useful contributions and control access to richer profiles.

Potential rules:

- Signup bonus gives users enough balance to explore one or two full experiences.
- Publishing a useful experience earns coins.
- Users can unlock full applicant profiles or detailed journey posts.
- High-quality, verified, and complete experiences earn more.

This should not block essential planning data. Official program information should remain broadly accessible.

## MVP Scope

The first strong MVP should focus on:

1. Persian-first Explore with reliable Germany and Netherlands program data.
2. User onboarding and matching profile.
3. Recommendation page with score explanations.
4. Tracker with deadlines, document checklist, notes, and status.
5. Experience submission form for accepted/rejected applicants.
6. Public anonymized experience browsing.
7. Admin/moderation basics.

## Non-MVP Scope

Defer advisor marketplace, payment gateway, mobile app, AI essay review, direct messaging, complex social feeds, and immigration law guidance beyond academic application planning.

## Data Strategy

Prioritize official and high-authority sources:

- DAAD for Germany.
- Study in NL for the Netherlands.
- UniversityAdmissions.se and Study in Sweden.
- Studyinfo.fi.
- Study in Denmark.
- Campus France.
- EduCanada.
- College Navigator/IPEDS for the United States.
- ROR for institution identity and deduplication.

For each source, define permission and crawl policy, stable identifiers, available fields, refresh frequency, known data gaps, and confidence per field.

## Persian-First Product Requirements

- Persian should feel native, not translated after the fact.
- RTL layout must be tested on every core page.
- Academic terms should use familiar Iranian applicant language.
- English should remain available for broader access and future growth.
- Dates, currencies, and deadline language should be clear for Iranian users.

## Trust and Safety Requirements

Experience sharing needs explicit consent, public/anonymized/private visibility choices, PII detection before publish, moderation queue, reporting, ability to unpublish, and clear separation between verified official data and community reports.

## Success Metrics

Early product metrics:

- users completing onboarding
- programs tracked per active user
- recommendation click-through rate
- percent of tracked programs with deadlines and checklist usage
- number of submitted experiences
- number of published experiences
- crawler freshness by country/source
- data field completeness for tuition, deadline, language, and requirements

## Product Risks

- Crawled data may be incomplete, stale, or legally sensitive to reuse.
- Requirements vary by applicant nationality, residency, and program intake.
- Shared experiences can expose personal information if consent and moderation are weak.
- Recommendations can be misleading if data quality is low.
- Persian UX quality will suffer if the product is designed in English and translated later.

## Positioning

Ghadam should not position itself as a legal immigration authority. It should position itself as an academic application planning and experience-sharing platform. Official source links should always be visible for final verification.
