# =============================================================================
# Dockerfile - FastAPI Backend (OllamaManager)
# Multi-stage build for production optimization
# =============================================================================

# Stage 1: Builder
FROM python:3.11-slim as builder

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir --upgrade pip uv

COPY pyproject.toml uv.lock* ./

RUN uv pip install --system --no-cache -r pyproject.toml

COPY src/ ./src/

# Stage 2: Production
FROM python:3.11-slim as production

LABEL maintainer="Ollama Manager Team"
LABEL description="FastAPI Backend for Ollama Management"
LABEL version="1.0.0"

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

RUN groupadd --gid 1000 appgroup \
    && useradd --uid 1000 --gid appgroup --shell /bin/bash --create-home appuser

WORKDIR /app

COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin
COPY --from=builder /build/src /app/src

RUN mkdir -p /app/logs /app/backups \
    && chown -R appuser:appgroup /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app/src \
    ENVIRONMENT=production \
    LOG_DIR=/app/logs \
    BACKUP_DIR=/app/backups

EXPOSE 8000

USER appuser

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/system/health || exit 1

CMD ["uvicorn", "ollama_manager.main:app", \
     "--host", "0.0.0.0", \
     "--port", "8000", \
     "--workers", "4", \
     "--loop", "uvloop", \
     "--http", "httptools", \
     "--no-access-log"]
