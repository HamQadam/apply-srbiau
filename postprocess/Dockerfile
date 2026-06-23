# syntax=docker/dockerfile:1

FROM python:3.12-slim AS builder
WORKDIR /app

COPY pyproject.toml /app/pyproject.toml
COPY src /app/src

RUN python -m venv /venv
ENV PATH="/venv/bin:$PATH"
RUN pip install --upgrade pip && pip install .

# Runtime
FROM python:3.12-slim
WORKDIR /app

COPY --from=builder /venv /venv
ENV PATH="/venv/bin:$PATH"
ENV PYTHONUNBUFFERED=1

ENTRYPOINT ["postprocess"]
CMD ["list-jobs"]
