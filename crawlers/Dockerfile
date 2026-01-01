FROM python:3.12-slim

WORKDIR /app

# Install uv for fast package management
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Copy project files
COPY pyproject.toml .
COPY README.md .
COPY db.py .
COPY cli.py .
COPY base/ base/
COPY daad_ingestor/ daad_ingestor/
COPY studyinnl_ingestor/ studyinnl_ingestor/

# Install dependencies
RUN uv pip install --system -e .

# Create state directory
RUN mkdir -p /state

# Default command - show help
ENTRYPOINT ["crawl"]
CMD ["sources"]
