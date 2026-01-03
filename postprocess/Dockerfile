# syntax=docker/dockerfile:1

FROM python:3.12-slim AS builder
WORKDIR /app

# If llama-cpp-python wheel isn't available for your platform,
# it may compile; keep build deps in builder only.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential cmake ninja-build \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml /app/pyproject.toml
COPY src /app/src

RUN python -m venv /venv
ENV PATH="/venv/bin:$PATH"
RUN pip install --upgrade pip && pip install .

# Runtime
FROM python:3.12-slim
WORKDIR /app

# runtime libs that often matter for performance / OMP
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /venv /venv
ENV PATH="/venv/bin:$PATH"

# Good defaults
ENV PYTHONUNBUFFERED=1

ENTRYPOINT ["postprocess"]
CMD ["list-jobs"]
