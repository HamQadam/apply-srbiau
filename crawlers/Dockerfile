FROM ghcr.io/astral-sh/uv:python3.12-bookworm AS builder
WORKDIR /app

# copy BOTH so dependency resolution/cache is correct
COPY pyproject.toml uv.lock ./

RUN uv sync --frozen --no-dev

COPY daad_ingestor ./daad_ingestor

FROM python:3.12-slim
WORKDIR /app

COPY --from=builder /app/.venv /app/.venv
COPY --from=builder /app/daad_ingestor /app/daad_ingestor

ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONUNBUFFERED=1

CMD ["python", "-m", "daad_ingestor.cli", "ingest"]
