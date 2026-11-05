# syntax=docker/dockerfile:1
FROM python:3.11.16-slim

WORKDIR /app

# Installed from the lock first, so the image gets the exact audited versions and this layer
# is cached until the lock changes.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY pyproject.toml README.md .
COPY app app
# The corpus feeds the build-time index below; data/evaluation carries the curated
# production-runs.jsonl that /ops reads. Only these two folders: local status and run files
# must not ship.
COPY data/programs data/programs
COPY data/evaluation data/evaluation

RUN pip install --no-cache-dir --no-deps -e .

# Production builds (Cloud Build) bake the ChromaDB index into the image, because Cloud Run
# has no persistent disk. The Gemini key arrives as a BuildKit secret, so it never lands in a
# layer, the image config, or the build log. Local Compose builds leave this off and use the
# Chroma server instead.
ARG BAKE_INDEX=false
RUN --mount=type=secret,id=google_api_key,required=false \
    if [ "$BAKE_INDEX" = "true" ]; then \
        if [ ! -s /run/secrets/google_api_key ]; then \
            echo "BAKE_INDEX=true needs the google_api_key build secret" >&2; \
            exit 1; \
        fi; \
        GOOGLE_API_KEY="$(cat /run/secrets/google_api_key)" \
        CHROMA_PERSIST_PATH=/app/data/chroma \
        python -m app.ingestion; \
    fi

EXPOSE 8000

# The shell expands the platform's PORT; exec keeps uvicorn as PID 1 so it gets the stop signal.
# Proxy trust comes from uvicorn's FORWARDED_ALLOW_IPS env var, set per environment.
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
