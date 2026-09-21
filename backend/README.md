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

## Evaluate the agent

One command runs the eligibility agent over the labeled student profiles in
`backend/data/evaluation/profiles.json` and reports how well it does:

```bash
python -m app.evaluation
```

It needs the same setup as the agent itself: ChromaDB running with the corpus ingested
(`python -m app.ingestion`) and `GOOGLE_API_KEY` set. Each profile runs
`EVALUATION_REPEATS` times (3 by default), one attempt at a time, and every attempt can take
up to `AGENT_RUN_TIMEOUT_SECONDS`, so a full run takes a while. Set `EVALUATION_REPEATS=1`
for a quick smoke run; consistency is not measured then.

The report covers eligibility accuracy (target above 80%), citation accuracy (above 70%),
hallucination rate (below 10%), consistency, mean latency, mean tool calls, and the failing
attempts by category. Scoring is deterministic text matching, not a model judge:

- **Citation:** the answer's source program equals the label's and its quoted clause contains
  the label's citation phrase.
- **Hallucination:** an eligible or partial answer with no clause or source (unless it is a
  partial answer that lists missing information), or a quoted clause that does not appear in
  the corpus. Answers that used web search are not scored for this.
- **Consistency:** the share of profiles whose attempts all return the same status.

Each profile names the program it asks about, and `expected_citation` is a short phrase copied
verbatim from that program's document. The loader rejects a label the current corpus cannot
back, so re-check the profiles after editing the documents.

Every completed run appends one JSON line to `data/evaluation-runs.jsonl` (override with
`EVALUATION_RUNS_PATH`), so trends can be read later. A run that aborts writes nothing. The
command exits 0 when a run completes, even if a target is missed, and 1 when it cannot run.
