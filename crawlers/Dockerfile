FROM ghcr.io/astral-sh/uv:python3.12-bookworm AS builder
WORKDIR /app

COPY pyproject.toml ./
# If you have uv.lock, copy it too (recommended)
# COPY uv.lock ./

RUN uv sync --no-dev

COPY daad_ingestor ./daad_ingestor

FROM python:3.12-slim
WORKDIR /app

COPY --from=builder /app/.venv /app/.venv
COPY --from=builder /app/daad_ingestor /app/daad_ingestor

ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONUNBUFFERED=1

CMD ["daad-ingest", "ingest"]
