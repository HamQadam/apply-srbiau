FROM ghcr.io/astral-sh/uv:python3.12-bookworm AS builder
WORKDIR /app

COPY pyproject.toml ./
RUN uv sync --no-dev

COPY daad_ingestor ./daad_ingestor

FROM python:3.12-slim
WORKDIR /app

COPY --from=builder /app/.venv /app/.venv
COPY --from=builder /app/daad_ingestor /app/daad_ingestor

ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONUNBUFFERED=1

# required at runtime:
# ENV DATABASE_URL=postgresql://user:pass@host:5432/dbname

CMD ["daad-ingest", "ingest"]
