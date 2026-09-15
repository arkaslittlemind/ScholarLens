# AGENTS.md

Instructions for AI coding agents working in this project.

AI tools must not add AI attribution to commits or pull requests, including AI
`Co-Authored-By` trailers or generated-by signatures. Preserve genuine human
attribution.

## What this is

**ScholarLens** is a scholarship and grant eligibility assistant. A student
describes their situation (income, state, GPA, major, and so on) and the app
tells them which programs they may qualify for, citing the exact rule behind
each result instead of returning an opaque yes/no.

The engine is an Agentic RAG built with Pydantic AI: a ReAct-style agent
decides per query whether to retrieve from a ChromaDB document store or run a
web search, then returns a structured, cited eligibility result. The frontend
is a Next.js (App Router) SaaS client; the backend is a FastAPI service
wrapping the agent.

## Repo layout

```
frontend/   Next.js (App Router, TypeScript, Tailwind) — the SaaS client
backend/    FastAPI + Pydantic AI — the API and Agentic RAG engine
infra/      Deployment / observability config (Docker Compose, env templates)
```

## Proportional engineering

Build for established requirements, not hypothetical scale, threats, or future
flexibility. Reuse existing code, the standard library, native platform features,
and installed dependencies before adding machinery.

- Unknown scale or extensibility defaults to the smaller reversible design. Do
  not infer enterprise, multi-tenant, hostile-user, or compliance requirements.
- Derive trust and data-integrity boundaries from actual reachability: untrusted
  input, auth/session/ownership, shared persisted data, destructive operations,
  payments, secrets, and sensitive data.
- Ask only when an unknown materially changes behavior, architecture, persisted
  data, interoperability, a real security boundary, or cost. Otherwise choose the
  simplest repository-native implementation.
- Add an abstraction, dependency, service, configuration surface, compatibility
  layer, or security mechanism only for a current requirement.
- Simplicity never removes real trust-boundary validation, data-loss prevention,
  accessibility, explicit security requirements, configured tests, or project rules.

v1 explicitly has no user accounts, no persisted student profiles, and no
multi-tenant admin. Don't build toward those unless the project plan changes.

## Coding conventions

**Frontend (Next.js + TypeScript)**
- Strict TypeScript, no `any` — use proper types or `unknown`
- Functional components, hooks for state/effects, one job per component
- Server components by default; `'use client'` only when interactivity, hooks,
  or browser APIs require it
- Tailwind CSS for styling, Tailwind v4 CSS-first config (`@theme` in
  `globals.css`, no `tailwind.config.js`), no inline styles
- Components in `src/components/[feature]/ComponentName.tsx`, pages in
  `src/app/[route]/page.tsx`

**Backend (FastAPI + Pydantic AI)**
- Validate all request/response models with Pydantic; typed settings via
  Pydantic Settings
- Explicit timeouts on every external call (OpenAI, web search, ChromaDB) —
  failures degrade to a controlled response, never a crash or hang
- Keep API keys server-side only; never expose them to the browser bundle
- Modules organized around `api`, `agent`, `tools`, `retrieval`, `ingestion`,
  `evaluation`, `config`
- Never log full student prompts/profiles or provider payloads

**Both**
- No commented-out code, no unused imports/variables
- Comment the why, not the what; delete comments that restate the code
- No em dashes in generated docs, comments, or commit messages

## Commands

### Frontend (`frontend/`)
- Dev server: `npm run dev` (http://localhost:3000)
- Build: `npm run build`
- Production server: `npm run start`
- Lint: `npm run lint`

### Backend (`backend/`)
- Requires Python 3.11+; all commands below assume the venv is active
- Setup: `py -3.11 -m venv .venv` (`python3.11` on macOS/Linux) then `pip install -e ".[dev]"`
- Dev server: `uvicorn app.main:app --reload` (http://localhost:8000, docs at `/docs`)
- Lint: `ruff check .`

### Infra (`infra/`)
- Local dev stack: `docker compose -f infra/docker-compose.yml up` brings up
  the FastAPI backend, ChromaDB (persistent volume), and an OpenTelemetry
  Collector. The frontend still runs separately via `npm run dev`.
- Tear down: `docker compose -f infra/docker-compose.yml down`

No test runner is configured yet in either app. Tests are not currently a
required gate.
