# Postprocess Jobs

Rules-first post-processing jobs for crawler outputs.

## Key Job: deadlines
- Reads `public.courses.deadline_notes`
- Fills missing `deadline_fall` / `deadline_spring`
- Uses deterministic parsing first; LLM is optional fallback

## Run locally
```bash
export DATABASE_URL="postgresql://user:pass@localhost:5432/db"
export LLM_MODEL_PATH="/path/to/Phi-3-mini-4k-instruct-q4.gguf"
postprocess run deadlines --batch-size 200 --max-rows 2000
