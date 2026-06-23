# Ghadam

Ghadam is a Persian-first academic immigration planning platform. It helps Iranian applicants discover university programs, compare deadlines and requirements, track applications, receive explainable recommendations, and learn from other applicants' shared experiences.

The product is focused on academic application planning, not general immigration law.

## Repository Structure

| Path | Purpose |
| --- | --- |
| `backend/` | FastAPI API, SQLModel models, PostgreSQL integration, auth, tracker, catalogue, matching, and Ghadam wallet concepts. |
| `frontend/` | React/Vite web app with Persian and English i18n. |
| `crawlers/` | Modular crawler framework with DAAD and Study in NL ingestors. |
| `postprocess/` | Data cleanup jobs, currently deadline parsing with optional local LLM fallback. |
| `deploy/` | Docker Compose stack for local/server deployment. |
| `docs/` | Product, architecture, audit, and implementation planning documents. |

## Start Here

- [Architecture](docs/ARCHITECTURE.md)
- [Product Proposal](docs/PRODUCT_PROPOSAL.md)
- [Current State Audit](docs/CURRENT_STATE.md)
- [Local Development](docs/LOCAL_DEVELOPMENT.md)
- [Implementation Tasks](docs/TASKS.md)
- [LLM Context](docs/LLM_CONTEXT.md)

## Local Commands

```bash
make run
make log
make crawl-daad
make crawl-nl
make postprocess-deadlines
```

Backend and frontend also have their own package files:

- Backend: `backend/pyproject.toml`
- Frontend: `frontend/package.json`
- Crawlers: `crawlers/pyproject.toml`
- Postprocess: `postprocess/pyproject.toml`

## Current Status

The project already has the foundation for:

- a crawled university/program catalogue
- Persian/English frontend
- user authentication
- application tracker
- recommendation matching
- Ghadam coin concepts
- early shared-experience models

The next important work is stabilizing the backend schema/API surface, improving data provenance, and turning the experience-sharing concept into a moderated, privacy-aware product flow.
