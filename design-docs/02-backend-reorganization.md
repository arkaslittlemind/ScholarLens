# 02 - Backend reorganization

## What

Before this feature, the whole backend was two functions living in one file
(`backend/app/main.py`): a root route and a health check. This feature didn't
add any new capability a user could see. It reorganized that one file into a
small set of Python packages, each with one job, and added a typed
configuration object. Hitting `/` or `/health` in a browser still returns
exactly the same JSON as before, byte for byte.

## Why

Feature 5 (the actual AI agent), feature 6 (ingestion), and feature 7
(evaluation) are all coming. Each of those is a distinct, substantial piece of
logic: the agent decides whether to search a document store or the web, the
ingestion pipeline turns PDFs into searchable chunks, the evaluation pipeline
scores the agent's answers against known-correct labels. If all of that code
had been added directly into `main.py` over time, that file would have become
a dumping ground where routing logic, agent logic, and business logic were
tangled together, and every future change would risk breaking something
unrelated.

Doing the reorganization now, while there is barely any code, costs almost
nothing (it's just moving two functions) and means every feature after this
one has an obvious place to live. This is the general "make the change easy,
then make the easy change" principle: restructuring is cheap when the codebase
is small, and gets more expensive and riskier the longer you wait.

## Key concepts

**Python package** - a directory containing an `__init__.py` file. That file
can be empty; its presence is what tells Python "treat this folder as an
importable module," e.g. `import app.agent`. The five new folders
(`agent/`, `tools/`, `retrieval/`, `ingestion/`, `evaluation/`) are packages
with nothing in them yet except a one-line docstring saying what will live
there later - they're labeled empty shelves, not working code.

**Separation of concerns** - the idea that different responsibilities (serving
HTTP requests, deciding what the agent does, fetching documents, reading
configuration) should live in different places, so a change to one doesn't
require understanding or touching the others. `api/` now only knows about
HTTP; it doesn't know or care how an eligibility answer gets computed.

**FastAPI `APIRouter`** - FastAPI's way of defining routes outside the main
`FastAPI()` app object, so they can be grouped by feature and wired in with
`app.include_router(...)`. This is exactly how `app/api/routes.py` now
declares `/` and `/health`, instead of decorating them directly on `app` in
`main.py`. As the API grows (feature 4 adds the real eligibility endpoint),
each area of the API can get its own router file without `main.py` growing
without bound.

**Typed settings (Pydantic Settings)** - instead of reading environment
variables with `os.environ.get("OPENAI_API_KEY")` scattered across the
codebase (easy to typo, no type checking, no single place to see what
configuration exists), `pydantic_settings.BaseSettings` defines a class whose
fields *are* the configuration:

```python
class Settings(BaseSettings):
    openai_api_key: str | None = None
    ...
```

Instantiating `Settings()` automatically reads matching environment variables
(case-insensitively, so `OPENAI_API_KEY` fills `openai_api_key`), validates
their types, and gives you autocomplete and type-checking everywhere you use
them. This is the same idea as .NET's `IOptions<T>` or Node's `zod`-validated
env parsing: config becomes a real, typed object instead of a bag of strings.

**The "dev/prod split" for config, without an explicit flag** - `SettingsConfigDict(env_file=".env")`
means: when a local `.env` file exists (developer's machine), load values from
it as a convenience. But real process environment variables - which is how
Render, Railway, Vercel, and most hosting platforms inject secrets in
production - always win over `.env` if both are set. So the same `Settings`
class works correctly in both environments without any `if
environment == "production"` branching anywhere. That branching would be
unnecessary machinery today because nothing in the app currently behaves
differently between dev and prod; if that ever becomes true, an explicit
environment field can be added then, backed by a real need.

**Why the provider keys are optional** - `openai_api_key: str | None = None`
means "this field is allowed to be missing." If it were required (no default),
creating `Settings()` without an `OPENAI_API_KEY` set would crash immediately.
Since no code calls OpenAI yet (that starts in feature 5), forcing the key to
exist now would just break every contributor's first `git clone` for no
reason. Optional-with-a-safe-default is the right shape for "not needed yet."

## Architecture

```
backend/app/
├── main.py          builds the FastAPI() app, includes the api router
├── config.py         Settings (typed env config) + get_settings()
├── api/
│   ├── __init__.py
│   └── routes.py      APIRouter: GET / , GET /health
├── agent/            (empty) - feature 5: the ReAct-style eligibility agent
├── tools/            (empty) - feature 5: web-search tool the agent can call
├── retrieval/        (empty) - feature 5/6: ChromaDB document lookup
├── ingestion/         (empty) - feature 6: turns source docs into ChromaDB entries
└── evaluation/       (empty) - feature 7: scores the agent against labeled data
```

Request flow today is trivial - a client hits `main.py`'s FastAPI app, which
routes into `api/routes.py`, which answers directly. Once feature 4 and 5 land,
the picture becomes:

```
client -> api/routes.py -> agent/ (decides: retrieval or web search)
                                -> retrieval/  (ChromaDB)
                                -> tools/      (web search)
                          -> structured, cited response back through api/
```

`config.py` sits off to the side and gets *read* by whichever module needs a
credential or setting (agent, tools, retrieval will all depend on it once they
have real logic) - it doesn't sit in the request path itself.

## What we actually built

- [`app/config.py`](../backend/app/config.py) - the `Settings` class and a
  `functools.lru_cache`-wrapped `get_settings()`. The cache means repeated
  calls return the same instance instead of re-reading the environment every
  time, which matters once this is wired into FastAPI's dependency injection
  in a later feature (`Depends(get_settings)`).
- [`app/api/routes.py`](../backend/app/api/routes.py) - the `root` and
  `health` handlers, moved unchanged from `main.py` onto an `APIRouter`.
- [`app/main.py`](../backend/app/main.py) - now 15 lines: construct the
  `FastAPI` app, `app.include_router(router)`. No route logic here anymore.
- Five empty scaffold packages (`agent/`, `tools/`, `retrieval/`,
  `ingestion/`, `evaluation/`), each just a docstring naming its future job.

Verified by starting the app and confirming `GET /` and `GET /health` return
the exact same JSON as before the change (via FastAPI's `TestClient`, which
runs the app in-process without a real network call - useful for quick checks
like this one, though it's not a substitute for a real running server once
there's actual behavior to click through).

## What's next

Feature 3 (local dev via Docker Compose) brings up FastAPI, ChromaDB, and the
observability collector together with one command - it doesn't touch these
modules directly. Feature 4 (FastAPI REST API) is the first feature that
actually fills in `api/` further: CORS, structured error responses, request
validation, and the real eligibility endpoint. That's also when `config.py`
gets its first real consumer.
