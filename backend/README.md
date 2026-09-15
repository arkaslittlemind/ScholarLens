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
