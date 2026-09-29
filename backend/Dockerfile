FROM python:3.11.16-slim

WORKDIR /app

# Installed from the lock first, so the image gets the exact audited versions and this layer
# is cached until the lock changes.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY pyproject.toml README.md .
COPY app app

RUN pip install --no-cache-dir --no-deps -e .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
