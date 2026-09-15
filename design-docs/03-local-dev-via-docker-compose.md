# 03 - Local dev via Docker Compose

## What

This feature made `docker compose -f infra/docker-compose.yml up` bring up
three separate services at once: the FastAPI backend, a ChromaDB vector
database, and an OpenTelemetry Collector, all networked together with one
command. Before this, the backend could only be run with `uvicorn` directly
on the host, and there was no ChromaDB or collector running at all. The
frontend is deliberately left out of this stack - it keeps running with
`next dev`, per the plan.

## Why

Feature 5 (the real agent) needs to talk to ChromaDB. Feature 14 needs
something to send OpenTelemetry data to. If those features are the first
time anyone starts these services, every problem with getting them running
(wrong ports, missing volumes, network config) gets tangled up with the
actual feature logic being built at the same time. Standing the empty shells
of these services up now, while there's nothing depending on them yet, means
feature 5 can just assume "ChromaDB is reachable at some address" and focus
entirely on retrieval logic, not on "how do I even get ChromaDB running."

This also matters for the production story: the plan says the backend runs
as a container on Render/Railway, not directly on a host. Getting the
`Dockerfile` right now, and testing it against production-shaped concerns
(does the image build, does the health check work inside a container) is a
question worth answering early and cheaply, not for the first time during an
actual deploy.

## Key concepts

**Containers vs. the host** - a Docker container packages an application
with everything it needs to run (Python, the installed libraries, the code)
so it behaves the same regardless of what's installed on the machine running
it. `backend/Dockerfile` is the recipe for building that package for this
app specifically.

**Docker Compose** - a tool for describing multiple containers that need to
run together as one system, in one YAML file (`infra/docker-compose.yml`).
Instead of manually running `docker run` three times with matching network
and volume flags, `docker compose up` reads the file and starts everything
correctly connected. Each `service:` entry (`backend`, `chromadb`,
`otel-collector`) becomes one running container, and Compose automatically
puts them all on a shared network where they can reach each other by service
name (e.g., code running in `backend` could reach ChromaDB at
`http://chromadb:8000` once feature 5 needs to).

**Persistent volumes** - a container's own filesystem disappears the moment
the container is removed - it's meant to be disposable. Chroma database
needs to survive `docker compose down` and restarts, though, so it's
attached to a *named volume* (`chromadb_data`) instead: Docker manages that
storage separately from the container's lifecycle, so the vector data
outlives any individual container run. This is the same idea as a database's
data directory being on a separate disk from the application server in
traditional infrastructure.

**Health checks** - a way for Docker (and later, a hosting platform) to ask
"is this container actually ready to serve traffic," not just "is the
process running." The `backend` service's `healthcheck` in the compose file
calls the app's own `/health` endpoint from inside the container every 10
seconds; `docker compose ps` then reports `healthy` instead of just `Up`.

**Bind mounts for local dev** - `volumes: ../backend:/app` in the compose
file overlays the host's `backend/` folder onto the container's `/app`
directory at runtime. Combined with `uvicorn --reload` in the `Dockerfile`'s
`CMD`, editing a file on the host is immediately visible inside the running
container - the same "save and see it update" workflow as running `uvicorn`
directly, but now happening inside the container that will eventually mirror
production.

**Why the OTel Collector has no Grafana Cloud exporter yet** - the
OpenTelemetry Collector's job is to receive telemetry (traces, metrics,
logs) from an application and forward it somewhere. Feature 14 is what
actually makes the FastAPI app emit that telemetry, and *that's* also when
this project will get real Grafana Cloud credentials (an OTLP endpoint URL
and an API key) to forward it to. Building the "forward to Grafana Cloud"
half now, without a real account to test it against, would produce
configuration nobody could verify actually works - it might even crash the
container on startup with an invalid endpoint. So today's collector config
only has a `debug` exporter, which just prints whatever it receives to its
own logs. It's a complete, testable piece on its own; feature 14 adds a
second exporter next to it rather than rewriting it.

## Architecture

```
                    infra/docker-compose.yml
        ┌──────────────────────────────────────────────┐
        │                                                │
   host:8000 ─────▶ backend (FastAPI, built from        │
        │            backend/Dockerfile, bind-mounted    │
        │            ../backend:/app for live reload)    │
        │                    │                            │
        │                    │ (not yet connected -       │
        │                    │  feature 5/6 will do this) │
        │                    ▼                            │
   host:8001 ─────▶ chromadb (official image)             │
        │            └── named volume: chromadb_data      │
        │                (survives container restarts)    │
        │                                                │
   host:4317/4318 ─▶ otel-collector (OTLP receiver only,  │
        │            "debug" exporter -                   │
        │            Grafana Cloud export added in        │
        │            feature 14)                          │
        └──────────────────────────────────────────────┘
```

All three currently start independently - `backend` lists the other two in
`depends_on` purely for startup ordering, since nothing calls them yet.

## What we actually built

- [`backend/Dockerfile`](../backend/Dockerfile) - `python:3.11-slim`, copies
  `pyproject.toml`, `README.md` (required because `hatchling` reads it for
  package metadata - the first build attempt failed without it, a real bug
  caught during implementation, not a hypothetical), and `app/`, then
  `pip install -e .` and runs `uvicorn --reload`.
- [`backend/.dockerignore`](../backend/.dockerignore) - keeps `.venv/`,
  caches, and `.env` out of the build context, mirroring
  `backend/.gitignore`.
- [`infra/docker-compose.yml`](../infra/docker-compose.yml) - the three
  services described above. The `backend` service's `env_file` uses
  Compose's `required: false` form, so `docker compose up` still works on a
  fresh clone before anyone has copied `backend/.env.example` to `.env` -
  consistent with `Settings` in feature 2 already treating every provider
  key as optional.
- [`infra/otel-collector-config.yaml`](../infra/otel-collector-config.yaml) -
  OTLP receiver (gRPC + HTTP) piped straight to a `debug` exporter.
- `README.md` and `AGENTS.md` now document
  `docker compose -f infra/docker-compose.yml up`/`down` alongside the
  existing frontend/backend quickstart commands.

Verified live (Docker Desktop was running in this environment): built the
image standalone and confirmed `/health` inside a bare container, then
brought the full stack up with `docker compose up -d --build`, confirmed all
three containers reached `Up`/`healthy` via `docker compose ps`, hit
`/health` through the compose-managed backend, and tore it down cleanly with
`docker compose down`.

## What's next

Feature 4 (FastAPI REST API) builds directly on the plain `uvicorn` dev path
from feature 2 - it doesn't need the container yet. Feature 5
(the Agentic RAG flow) is the first to actually connect to `chromadb` over
the network this feature set up. Feature 14 (OpenTelemetry instrumentation)
is what finally gives the collector something real to receive, plus a second
exporter forwarding it on to Grafana Cloud.
