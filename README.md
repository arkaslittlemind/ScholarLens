# ScholarLens

Students often don't know which scholarships or grants they actually qualify
for: eligibility rules are buried in long PDFs and program pages, and keyword
search either misses real matches or confidently returns wrong ones.
ScholarLens takes a student's basic information (income, state, GPA, major,
and so on) and determines which programs they may qualify for, showing the
exact rule behind each result, so the answer is auditable rather than a
black box.

## Repo layout

```
frontend/   Next.js (App Router, TypeScript, Tailwind), the SaaS client
backend/    FastAPI + Pydantic AI, the API and Agentic RAG engine
infra/      Deployment / observability config (Docker Compose, env templates)
```

## Quickstart

### Frontend
```bash
cd frontend
npm install
npm run dev            # http://localhost:3000
```

### Backend
```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\Activate.ps1   |   macOS/Linux: source .venv/bin/activate
pip install -e ".[dev]"
uvicorn app.main:app --reload   # http://localhost:8000  (docs at /docs)
```

### Operations view (`/ops`)

`/ops` is a password-protected page for maintainers. It shows traffic trends for
the last 6 hours (request rate, 5xx ratio, `/eligibility` latency, tool calls),
the latest and recent evaluation runs against their targets, and ingestion
health. The evaluation and ingestion sections read the backend's own status
files. The trends come from Grafana Cloud.

To enable it:

1. Generate one long random token and set it as `OPS_API_TOKEN` in both
   `backend/.env` and `frontend/.env.local`. The frontend sends it server-side
   only, so the browser never sees it.
2. Set `OPS_USERNAME` and `OPS_PASSWORD` in `frontend/.env.local`. `/ops` asks
   for them through the browser's login prompt, and returns 503 while either is
   unset.
3. Optional, for the trend charts: set `GRAFANA_PROMETHEUS_URL`,
   `GRAFANA_PROMETHEUS_USER`, and `GRAFANA_PROMETHEUS_TOKEN` in `backend/.env`.
   The comments in `backend/.env.example` say where to find them. Without
   them, the page says the trends are not configured and shows everything else.

The shared password has no rate limiting or lockout yet (feature 18), so use a
long one.

### Deploy

The backend runs on Railway as one always-on service, and ChromaDB runs embedded
on that service's volume. The frontend runs on Vercel. Both serve HTTPS. Keep
every secret in the platform's env vars, never in the repo.

**1. Backend on Railway.** Create a project from this GitHub repo with one
service, then set it up:

- Settings: root directory `backend`, config file `/backend/railway.toml`. The
  config path is absolute because Railway does not resolve it from the root
  directory. That file sets the Dockerfile build, the `/health` check, and
  restart on failure.
- Keep 1 replica. The rate limits live in process memory and embedded Chroma
  allows one process.
- Add a volume mounted at `/data`. Do not mount it over `/app/data`, which
  holds the bundled corpus.
- Generate a public domain.
- Variables: `GOOGLE_API_KEY`, `TAVILY_API_KEY`, `OPS_API_TOKEN`,
  `FRONTEND_ORIGIN` (set in step 3), `CHROMA_PERSIST_PATH=/data/chroma`,
  `INGESTION_STATUS_PATH=/data/ingestion-status.json`,
  `EVALUATION_RUNS_PATH=/data/evaluation-runs.jsonl`, and
  `FORWARDED_ALLOW_IPS=*`. Optional: the `GRAFANA_PROMETHEUS_*` values for
  `/ops` trends.

`FORWARDED_ALLOW_IPS` is read by uvicorn itself. Railway's edge replaces any
`X-Forwarded-For` the client sends and puts the real client IP first. With
`*`, uvicorn takes that first entry, so the per-IP rate limits apply to real
visitors. If the variable is unset, every visitor shares one limit.

**2. Ingest the corpus once.** Run ingestion inside the running service. It
reads the bundled corpus from `/app/data/programs`.

```bash
railway ssh -s <backend-service> -- sh -c "cd /app && python -m app.ingestion"
```

Then restart the service (latest deployment's menu, Restart) so the API reopens
the rebuilt collection. Repeat both whenever `backend/data/programs/` changes.

**3. Frontend on Vercel.** Import the repo with root directory `frontend` and
set these variables:

- `NEXT_PUBLIC_API_URL`: the Railway `https://` origin. It is inlined at build
  time, so a change needs a redeploy.
- `OPS_USERNAME`, `OPS_PASSWORD`, `OPS_API_TOKEN`: the token must equal the
  backend's.

Then set the backend's `FRONTEND_ORIGIN` to the Vercel production origin
exactly, such as `https://scholarlens.vercel.app`, with no trailing slash.
Railway stages variable changes, so deploy them for the backend to pick up the
new origin. Vercel preview deployments are not allowed by CORS.

### Docker (local dev)
```bash
docker compose -f infra/docker-compose.yml up
```
Brings up the FastAPI backend, ChromaDB (persistent volume), and an
OpenTelemetry Collector together. The frontend still runs separately via
`next dev`.

The backend traces each request (API, agent, LLM calls, retrieval, web search)
and sends spans to the collector, which prints them
(`docker compose -f infra/docker-compose.yml logs otel-collector`). Spans carry
timings, models, token counts, and error types, never student input.

Metrics go to the same collector, which serves them in Prometheus format at
<http://localhost:8889/metrics>. The backend exports every 60 seconds; set
`OTEL_METRIC_EXPORT_INTERVAL=5000` (milliseconds) on the backend for faster
local checks. Metric labels only ever take fixed values, never student input.

| Metric (Prometheus name) | What it measures |
| --- | --- |
| `http_server_duration_milliseconds` | Request count, latency, and status code per route (`/health` excluded) |
| `scholarlens_agent_duration_seconds` | Agent run duration by outcome: `success`, `timeout`, `tool_unavailable`, `error` |
| `scholarlens_llm_requests_total` | Model requests made by completed agent runs |
| `gen_ai_client_token_usage` | Input and output tokens per model response (from Pydantic AI) |
| `scholarlens_tool_calls_total` | Tool calls by tool name |
| `scholarlens_retrieval_duration_seconds` | ChromaDB retrieval latency by outcome |
| `scholarlens_web_search_duration_seconds` | Tavily search latency by outcome |
| `scholarlens_ingestion_*` | Last ingestion run: success, finish time, chunk count |
| `scholarlens_evaluation_*` | Latest evaluation run: accuracy, citation accuracy, hallucination rate, consistency, latency, tool calls, run time |

The ingestion and evaluation gauges are read from `data/ingestion-status.json`
and `data/evaluation-runs.jsonl`; a gauge is absent until its file exists.

To also send traces to Grafana Cloud Tempo and metrics to Grafana Cloud's
Prometheus, copy `infra/.env.example` to `infra/.env`, fill in your stack's OTLP
credentials, and add the override:
```bash
docker compose -f infra/docker-compose.yml -f infra/docker-compose.grafana.yml up
```

#### Dashboards

Two Grafana dashboards live in `infra/grafana/dashboards/`:

- `service-health.json`: request rate, 5xx ratio and 4xx rate, `/eligibility`
  latency, agent outcomes and duration, and ChromaDB and Tavily latency and
  failures.
- `ai-quality.json`: the latest evaluation run, evaluation trends against the
  targets (eligibility above 80%, citation above 70%, hallucination below 10%),
  tool calls, LLM requests, and token usage.

To import one, open Grafana Cloud, go to Dashboards > New > Import, and upload
the file. Pick your stack's Prometheus data source in the "Data source" drop-down
at the top of the dashboard. Importing a file again replaces the existing copy.
The panels only fill while the backend runs with the Grafana override above.

A few things to know when reading them:

- The evaluation panels show the latest run. The backend re-reads it at every
  metric export and Grafana Cloud's Prometheus (Mimir) stores each sample, so a
  trend line is flat between runs, steps when
  `python -m app.evaluation` finishes, and has gaps while the backend is down. A
  quality stat with no value means the run could not measure it (for example, no
  hallucination judgement); it is never shown as 0.
- Prometheus `rate()` cannot see the first sample of a new series, so the first
  request with a new status code or failure outcome after a backend start does
  not show up in rate panels. Later ones do.
