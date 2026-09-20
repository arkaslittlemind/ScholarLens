# ScholarLens — Backend (FastAPI)

Python API in front of the Agentic RAG eligibility engine.

## Setup

Needs **Python 3.11 or newer** (`pyproject.toml` sets `requires-python = ">=3.11"`).
Create the venv with an explicit interpreter rather than a bare `python`, which
may resolve to an older version and make the install below fail on that
constraint. The container builds on 3.11, so 3.11 keeps local and container
behavior closest.

```bash
cd backend

# Windows:
py -3.11 -m venv .venv
.venv\Scripts\Activate.ps1
# macOS/Linux:
# python3.11 -m venv .venv
# source .venv/bin/activate

pip install -e ".[dev]"   # or: pip install -r requirements.txt
```

Every command below assumes that venv is active.

## Run

```bash
uvicorn app.main:app --reload
```

- API: http://localhost:8000
- Health: http://localhost:8000/health
- Interactive docs: http://localhost:8000/docs

## Ingest the knowledge base

The eligibility agent retrieves program rules from ChromaDB. One command rebuilds
that collection from the documents in `backend/data/programs/`:

```bash
python -m app.ingestion
```

It needs ChromaDB running (`docker compose -f infra/docker-compose.yml up -d chromadb`)
and `GOOGLE_API_KEY` set. Through Docker Compose instead:

```bash
docker compose -f infra/docker-compose.yml run --rm backend python -m app.ingestion
```

Each source is a `.md` or `.txt` file with a front-matter header. `program`,
`document`, and `url` are all required, and `url` must be the official source:

```
---
program: Example Merit Scholarship
document: Eligibility requirements
url: https://example.edu/scholarships/merit
---
## Residency

Applicants must be legal residents of the state.
```

Headings split a document into sections and each chunk records its section as a
clause reference. Text is copied verbatim from the official page; do not paraphrase
rules.

Every run replaces the collection from scratch. Documents are validated and embedded
before the old collection is deleted, so bad input or an embedding failure leaves the
existing knowledge base untouched. The outcome of the latest run, success or failure,
is written to `data/ingestion-status.json` (override with `INGESTION_STATUS_PATH`).
The command exits 1 on failure.
