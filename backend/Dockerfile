FROM docker.arvancloud.ir/python:3.12-slim

WORKDIR /app

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

# Copy dependency files
COPY pyproject.toml uv.lock README.md ./

# Install dependencies
RUN uv sync --frozen --no-dev

# Copy application code
COPY app ./app
COPY alembic ./alembic
COPY alembic.ini ./

# Create uploads directory
RUN mkdir -p /app/uploads

# Expose port
EXPOSE 8888

# Run with uvicorn
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8888"]
