FROM python:3.11.16-slim

WORKDIR /app

# Installed from the lock first, so the image gets the exact audited versions and this layer
# is cached until the lock changes.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY pyproject.toml README.md .
COPY app app
# Ingestion and evaluation run inside the deployed service, so the image carries their inputs.
# Only these two folders: the local status and run files must not ship.
COPY data/programs data/programs
COPY data/evaluation data/evaluation

RUN pip install --no-cache-dir --no-deps -e .

EXPOSE 8000

# The shell expands the platform's PORT; exec keeps uvicorn as PID 1 so it gets the stop signal.
# Proxy trust comes from uvicorn's FORWARDED_ALLOW_IPS env var, set per environment.
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
