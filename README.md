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
