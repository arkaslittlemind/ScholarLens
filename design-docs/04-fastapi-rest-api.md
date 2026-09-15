# 04 - FastAPI REST API

## What

This feature built the front door of the backend: a `POST /eligibility`
endpoint that accepts a student's situation, validates it, and is typed to
return an eligibility verdict with the rule behind it. It also added one
consistent error shape for every failure, and CORS configuration so a browser
is allowed to call the API at all.

The endpoint does not actually answer anything yet. It validates the request
and then returns `503 engine_unavailable`, because the thing that would do the
answering (the AI agent) does not exist until feature 5. Everything around the
answer is real; the answer itself is a deliberate hole.

## Why

The build-plan line for this feature says it adds "the core eligibility
endpoint that invokes the existing Pydantic AI agent." That premise turned out
to be false: `app/agent/` was an empty scaffold from feature 2, and a search
confirmed no Python existed anywhere outside `backend/app/`. The original
capstone's agent code was never carried into this repository.

That left a real choice. Three options:

1. **Fake it** - return a hardcoded "you are eligible" response so the endpoint
   works end to end.
2. **Skip it** - build only health checks and CORS, and let feature 5 add the
   endpoint.
3. **Build everything except the answer** - validate the input, publish the
   full contract, and return an honest "the engine is not available" error.

Option 1 is genuinely dangerous here. The plan front-loads an early deploy, so
a fake verdict could end up on a live URL telling a real student they qualify
for money. Option 2 delays the contract, and the project overview explicitly
says to lock the response shape in feature 4/5 because the verdict UI (feature
10) and transparency UI (feature 11) both consume it directly.

So option 3. The cost of not doing this feature now is that features 10 and 12
would have nothing to build against, and every frontend decision about how to
display a verdict would be blocked behind the agent being finished.

## Key concepts

**An API contract** is the agreement between two programs about what a request
and response look like: which fields exist, what types they are, which are
required, and what the error cases are. Unlike a function call inside one
program, the two sides are built separately (here: a Python backend and a
TypeScript frontend, eventually on different servers), so the agreement has to
be written down somewhere both sides can see. That written-down form is the
contract, and this feature's whole job was to fix it in place.

**Validation at the boundary.** Untrusted input is anything that arrives from
outside your program: a user's form submission, another service's request.
"Boundary" means the edge where it enters. The rule is to check it there, once,
and convert it into a trusted, typed object, rather than sprinkling `if` checks
throughout the code that uses it. Pydantic does this by declaring the shape as
a class:

```python
class EligibilityRequest(BaseModel):
    description: str = Field(min_length=1, max_length=2000)
    income: float | None = Field(default=None, ge=0)
```

FastAPI sees that annotation on the route function and automatically rejects
anything that does not fit, before your code runs. `ge=0` means "greater than
or equal to zero"; a negative income never reaches the handler.

**Wire values vs. code names.** `EligibilityStatus` is an enum (a fixed set of
allowed values). In Python the members are written `NOT_ELIGIBLE`, but the
value sent over the network is the string `"not_eligible"`:

```python
class EligibilityStatus(str, Enum):
    NOT_ELIGIBLE = "not_eligible"
```

The distinction matters because the frontend will compare against the string,
not the Python name. Changing the wire value later breaks the client; changing
the Python name does not. Inheriting from `str` as well as `Enum` is what makes
it serialize as a plain string rather than an object.

**OpenAPI** is a machine-readable description of an HTTP API, which FastAPI
generates automatically from your type annotations and serves at
`/openapi.json` (with a human-browsable version at `/docs`). This is the
"somewhere both sides can see" from earlier: the frontend can generate
TypeScript types straight from it, so the two sides cannot silently drift
apart. It is why locking the contract now has value even though the endpoint
returns 503 - the shape is published and consumable before the logic exists.

**CORS (Cross-Origin Resource Sharing).** Browsers enforce a rule called the
same-origin policy: JavaScript running on `site-a.com` cannot read responses
from `site-b.com`. This exists so a malicious page cannot quietly read your
webmail using your logged-in session. But ScholarLens is deliberately split
across two origins (frontend on `localhost:3000`, backend on `localhost:8000`),
which the browser treats as different sites. CORS is the server's way of saying
"requests from this specific origin are allowed," via a response header the
browser checks:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=False,
)
```

`allow_credentials=False` means cookies are not sent along. There are no
sessions or logins in v1, and combining credentials with a permissive origin is
a classic way to build an account-takeover hole, so the safe setting is the one
that matches reality today.

**Status codes have fault families.** HTTP status codes in the 400s mean "the
client sent something wrong"; the 500s mean "the server broke." Which family a
response falls in tells the caller whether retrying unchanged could ever help,
and whose bug it is. This sounds academic until you get it wrong, which is
exactly what happened here twice (see below).

**Middleware** is code that wraps every request and response, running before
your route on the way in and after it on the way out. `CORSMiddleware` adding a
header to every response is middleware. The ordering of these wrappers turns
out to matter in a way that is easy to miss, which is finding F-03 below.

## Architecture

```
    browser (localhost:3000)
            |
            |  POST /eligibility  { description, income, state, gpa, major }
            v
  ┌─────────────────────────────────────────────────────┐
  │ main.py                                              │
  │   CORSMiddleware  (is this origin allowed?)          │
  │   error handlers  (turn any failure into one shape)  │
  └───────────────────────┬─────────────────────────────┘
                          v
                  api/models.py
              EligibilityRequest validates
                   /          \
            invalid            valid
               |                  |
               v                  v
        422 + envelope      api/eligibility.py
                                  |
                                  |  feature 5 puts the agent call here
                                  v
                          503 engine_unavailable
                                  |
                            (later: returns)
                                  v
                          agent/models.py
                         EligibilityResult
```

The import direction is deliberate: `api` imports from `agent`, never the
reverse. `EligibilityResult` lives in `agent/models.py` rather than with the
API code because in feature 5, Pydantic AI will declare that exact class as the
agent's output type. The domain result belongs to the domain; the API layer
just borrows it to describe its response. If it lived in `api/`, the agent
would have to import from the transport layer to describe its own output, which
is backwards.

## What we actually built

- [`app/agent/models.py`](../backend/app/agent/models.py) - `EligibilityStatus`,
  `Source`, and `EligibilityResult`. `supporting_clause` and `source` are
  nullable, but only so a verdict driven purely by missing information can be
  expressed. The cited clause is the product's entire differentiator, so the
  spec explicitly forbids feature 5 from treating null as a convenient default.
- [`app/api/models.py`](../backend/app/api/models.py) - `EligibilityRequest`.
  Every text field is length-bounded, because this is untrusted public input
  that feature 5 will forward to a paid model.
- [`app/api/errors.py`](../backend/app/api/errors.py) - the envelope
  `{"error": {code, message, fields}}` and the handlers that produce it.
- [`app/api/eligibility.py`](../backend/app/api/eligibility.py) - the route.
- [`app/main.py`](../backend/app/main.py) - wires in CORS, the handlers, and
  the router.

### Why the error envelope exists at all

Not for tidiness. FastAPI's default validation error looks like this:

```json
{"detail": [{"loc": ["body", "description"], "msg": "...", "input": "<what you sent>"}]}
```

That `input` field echoes the submitted value straight back. `AGENTS.md`
forbids logging or emitting full student prompts and profiles, and the whole
point of this endpoint is that people type personal circumstances into it. So
the envelope replaces it with field *names* only:

```python
location = [part for part in error["loc"] if isinstance(part, str) and part != "body"]
```

A privacy rule, in other words, is what turned "nicer errors" into a
requirement.

### Three bugs worth remembering

**The Starlette/FastAPI exception split.** After wiring the handlers, a request
to an unknown path still returned FastAPI's default `{"detail": "Not Found"}`.
The cause: FastAPI's `HTTPException` is a *subclass* of Starlette's, and an
unmatched route raises the parent class. A handler registered on the subclass
never sees it. Registering on the Starlette base catches both. Worth
internalizing as a general lesson: registering a handler by type catches that
type and its subclasses, never its parents.

**The published contract disagreed with the code.** The first independent
review found that `/openapi.json` still declared FastAPI's default
`HTTPValidationError` for 422 and did not mention 503 at all. So the envelope
was real at runtime but invisible in the contract, and the published shape was
precisely the input-echoing one it had been written to replace. A frontend
generating types from OpenAPI would have generated the wrong error type. Fixed
by declaring it explicitly:

```python
responses={
    422: {"model": ErrorResponse, ...},
    503: {"model": ErrorResponse, ...},
}
```

The lesson: with a framework that derives documentation from your code, it is
easy to assume the documentation followed you. It only follows where you
annotated.

**A client error blamed on the server.** The original code mapped a few known
statuses and defaulted everything else to `internal_error`. The first reviewer
noticed and dismissed it as unreachable. The second reviewer *disproved* that
by finding a real trigger: send a body containing invalid UTF-8, and FastAPI's
own parser raises `HTTPException(400)`, which fell through the default and came
back as HTTP 400 labeled `internal_error` - a client mistake reported as a
server fault. The fix resolves by family rather than patching the one case:

```python
def _code_for_status(status_code: int) -> str:
    if status_code in _STATUS_CODES:
        return _STATUS_CODES[status_code]
    return "bad_request" if status_code < 500 else "internal_error"
```

Two lessons. First, prefer the fix that eliminates a class of bug over the one
that handles the reported instance. Second, "no current code path does this" is
a claim about today, and frameworks raise exceptions you did not write.

### How it was checked

No test runner is configured yet (feature 19), so everything was proved with
one-off `fastapi.testclient.TestClient` runs: valid body, missing and
over-length `description`, negative `gpa`, malformed and undecodable JSON,
unknown path, wrong method, forced unhandled exception, and CORS from both
allowed and disallowed origins. The privacy claim got its own explicit check -
no submitted value appears in any error body, including a canary planted inside
a deliberately raised exception.

This feature also tripped the project's `when-sensitive` review gate (first
public endpoint, personal data, security boundary), so three independent
reviewers with no memory of the build audited it. They found six issues, three
of which were fixed here. Three remain open in `blueprint/context/findings.md`
as feature-18 hardening: 500 responses carry no CORS header (because
Starlette's error middleware sits *outside* `CORSMiddleware`), the request body
is unbounded before `max_length` applies, and a 405 no longer carries its
`Allow` header.

## What's next

Feature 5 is the one that fills the hole: it builds the Pydantic AI agent,
declares `EligibilityResult` as its output type, and replaces the single
`raise HTTPException(503)` with a real call. Nothing else in this contract
changes, which was the point of building it this way. Feature 5 will also
extend `_STATUS_CODES` with provider-failure codes (502, 504 for timeouts),
which is the natural moment to revisit the fault-family mapping.

Feature 12 wires the frontend to this contract using the published OpenAPI
schema, and feature 18 owns the three deferred findings plus rate limiting and
production CORS lockdown.
