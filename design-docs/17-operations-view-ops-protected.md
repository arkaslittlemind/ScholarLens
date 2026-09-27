# 17 - Operations view (`/ops`, protected)

## What

Features 13 to 16 built the observability plumbing: logs, traces, metrics, and
Grafana dashboards. All of it lives in tools a student never sees, and most of
it lives in Grafana, which a casual reviewer won't log into. Feature 17 puts the
headline numbers **inside the ScholarLens app itself**, on a page at `/ops`:

- **Traffic:** request rate, 5xx error ratio, `/eligibility` latency, and tool
  calls for the last 6 hours, drawn as four charts.
- **Evaluation:** the latest run's scores against the project's targets, plus a
  table of the last 10 runs.
- **Ingestion:** whether the last knowledge-base build succeeded, and when.

Because this is internal data, the page is **locked**. The browser asks for a
username and password before it shows anything. Behind that, the page's server
fetches its data from a new backend endpoint using a second secret the browser
never sees. Traffic numbers come from Grafana Cloud (the same queries as the
dashboards), and evaluation and ingestion numbers come from files the backend
already writes.

## Why

The build plan calls `/ops` "the page that makes the productionized claim real
to a reviewer". Without it:

- **The evidence is scattered.** Proving the service is healthy means opening
  Grafana, finding the right dashboard, and reading PromQL panels. Evaluation
  results live in a JSONL file on disk. Nobody reviewing a portfolio project
  does that.
- **The maintainer role has no home.** The project plan names two users:
  students, and maintainers who "monitor production health and AI behavior".
  Until now the second user had no screen in the product.
- **Internal data would leak if it were public.** Error rates, model names, and
  accuracy scores aren't secrets exactly, but they're not for the public page
  either. The plan says "protected". v1 has no user accounts, so protection has
  to work without them.

The cost of skipping it: the observability work stays invisible, and the
"maintainer" persona remains a sentence in a plan.

## Key concepts

### Authentication vs authorization

- **Authentication** answers "who are you?" (or at least "do you know the
  secret?").
- **Authorization** answers "are you allowed to do this?".

This feature only does authentication, and a weak form of it: anyone who knows
the shared password is treated as a maintainer. There is no identity, no roles,
no per-user permissions. That matches v1's explicit "no user accounts" rule.
Think of it as a key to a staff room rather than a staff ID badge: everyone
with the key gets in, and the room can't tell them apart.

### HTTP Basic Auth

HTTP has a built-in, decades-old way to ask for a password:

1. The browser requests `/ops` with no credentials.
2. The server answers **401 Unauthorized** with a header
   `WWW-Authenticate: Basic realm="ScholarLens ops"`.
3. The browser sees that header and shows its **native login dialog**. No
   login page needs to be built.
4. The user types a username and password. The browser joins them as
   `username:password`, encodes that in **Base64**, and resends the request with
   `Authorization: Basic b3BzOnB3LXRlc3QtMQ==`.
5. The browser remembers them and sends them with every later request to that
   site until it closes.

Important: **Base64 is an encoding, not encryption.** Anyone who sees the header
can decode the password instantly. Basic Auth is only safe over **HTTPS**, where
the whole request is encrypted in transit. Locally that's fine (it's your own
machine); in production, Vercel serves HTTPS.

Analogy: Basic Auth is a doorman who asks for the password, not a vault. It is
simple and good enough for one internal page. It has no "log out" button, no
lockout after wrong guesses, and no rate limiting. Those gaps are why feature 18
exists.

### Shared secrets and bearer tokens

A **shared secret** is a value that two parties both know and nobody else does.
Here there are two:

- `OPS_USERNAME` / `OPS_PASSWORD`: shared between a human and the frontend.
- `OPS_API_TOKEN`: shared between the frontend's server and the backend.

The backend expects the token as a **bearer token**:
`Authorization: Bearer <token>`. "Bearer" means "whoever bears (holds) this
token gets in". The token is not tied to a person; possession is the proof.
It's like a concert wristband: the bouncer doesn't check your ID, just the
band.

### Defense in depth: two locks, not one

```text
browser --(Basic Auth: password)--> Next.js server --(Bearer: OPS_API_TOKEN)--> FastAPI
```

Why two secrets instead of one? Because each lock guards a different door:

- The **password** guards the page from people.
- The **token** guards the data endpoint. The FastAPI backend is a separate
  service with its own URL. If only the page were locked, anyone who guessed
  `GET /ops/summary` on the backend could read the data directly.

If one lock is misconfigured, the other still holds. This is **defense in
depth**: independent layers, so one mistake doesn't expose everything.

### Fail closed

A security check can fail in two directions when it's misconfigured:

- **Fail open:** "no password set, so let everyone in". Dangerous, because a
  forgotten env var silently publishes the page.
- **Fail closed:** "no password set, so let nobody in". Safe, because the
  worst outcome is a broken page, which someone will notice and fix.

Both locks here fail closed. The proxy returns **503** "Operations view is not
configured" when `OPS_USERNAME` or `OPS_PASSWORD` is missing, and the backend
returns **503 `ops_not_configured`** when `OPS_API_TOKEN` is missing.

### Timing attacks and constant-time comparison

A normal string comparison (`a == b`) stops at the **first differing
character**. Comparing `"hunter2"` to `"xunter2"` returns almost instantly;
comparing it to `"hunter3"` takes slightly longer, because six characters match
first. An attacker who can time thousands of requests precisely can use that
difference to guess a secret one character at a time. That is a **timing
attack**.

A **constant-time comparison** always inspects every byte, so the time taken
reveals nothing about how much matched:

- Python: `secrets.compare_digest(a, b)`.
- Node: `crypto.timingSafeEqual(a, b)`. It throws if the two buffers have
  different lengths, which would itself reveal the secret's length. The fix
  used here: **hash both sides with SHA-256 first**. Every SHA-256 digest is 32
  bytes, so the lengths always match and nothing leaks.

The proxy also compares **both** the username and password on every request,
even when the username is already wrong, so the timing doesn't reveal which of
the two was incorrect.

### The Next.js proxy (formerly middleware)

A **proxy** in Next.js 16 is a function in `src/proxy.ts` that runs **before**
a route renders. It can let the request through (`NextResponse.next()`), answer
it directly (a 401), redirect, or rewrite. A **matcher** limits which paths it
runs on:

```ts
export const config = { matcher: ["/ops", "/ops/:path*"] };
```

Without a matcher it runs on every request, including CSS and JS files. In
earlier Next.js versions this file was called `middleware.ts`; version 16
renamed it to `proxy.ts` (same behavior, new name). The proxy runs on the
Node.js runtime by default, which is why `node:crypto` is available in it.

### Server components, client components, and where secrets can live

Next.js App Router has two kinds of React components:

- **Server components** (the default) run only on the server. Their code and
  any values they read never ship to the browser. The browser just receives
  the HTML they produced.
- **Client components** (files starting with `"use client"`) run in the
  browser too, so everything they import is bundled into public JavaScript.

Environment variables follow the same split:

- A variable named `NEXT_PUBLIC_*` is **inlined into the browser bundle** at
  build time. Never put a secret in one.
- Any other variable (like `OPS_API_TOKEN`) is only readable by server code.

So the rule for secrets is: **read them only in server code**. Here,
`fetchOpsSummary()` in `lib/ops.ts` reads `OPS_API_TOKEN` inside the function,
and only the server page calls it. The one client component (`TrendChart`)
imports **types** from that file (`import type`), which vanish at build time.
The build was checked by searching `.next/static` (the public bundle) for a
marker token value: not found.

### Prerendering vs request-time rendering

By default, Next.js tries to **prerender** pages at build time: run them once,
save the HTML, serve that file forever. Great for a landing page, wrong for a
live dashboard. It would bake in whatever the data was during `npm run build`,
and it would call the backend at build time without the right secrets.

`await connection()` from `next/server` tells Next.js "stop prerendering here;
this page needs a real incoming request". The build output then marks `/ops`
with `ƒ` (dynamic, server-rendered on demand) instead of `○` (static).

### The Prometheus HTTP API: `query_range`

Grafana Cloud stores metrics in Mimir, which speaks the **Prometheus HTTP API**.
`GET /api/v1/query_range` with four parameters:

- `query`: the PromQL expression
- `start`, `end`: Unix timestamps (here: now minus 6 hours, and now)
- `step`: seconds between points (here: 300, so 73 points)

The answer is a **matrix**: a list of series, each with its labels and its list
of `[timestamp, "value"]` pairs. Two surprises:

- Values arrive as **strings** (`"0.036"`), so they must be parsed.
- A value can be `"NaN"` (0 divided by 0, like an error ratio with no traffic)
  or `"+Inf"`. JSON has no NaN, and a chart can't draw it, so the backend maps
  both to `null`, which the charts draw as a **gap**.

### Timeouts: per-phase vs total deadline

Every external call needs a **timeout**, or one slow dependency hangs the whole
request. But "timeout" means different things:

- `httpx`'s `timeout=5` is **per phase**: 5 s to connect, then 5 s between
  bytes while reading, and so on. A server that drips one byte every 4 seconds
  never trips it and can take forever in total.
- A **total deadline** caps the whole operation, however it's spent.

Here the five Grafana queries run **in parallel** with `asyncio.gather`, and the
whole batch sits inside `asyncio.timeout(5)`: one deadline for all of them. A
mock Grafana that took 3 s per answer was cut off at a 1 s deadline in tests.

### Graceful degradation

When one part of a page's data fails, don't fail the page. The summary has
three independent sections, and each degrades on its own:

| Problem | What happens |
| --- | --- |
| Grafana not configured | `traffic.status = "not_configured"`, message shown |
| Grafana slow, down, or rejecting the token | `traffic.status = "unavailable"`, message shown |
| No evaluation runs file | `runs: []`, "No evaluation runs yet" shown |
| Malformed line in the runs file | that line skipped |
| No ingestion status file | `ingestion: null`, "Never ingested" shown |

The endpoint itself returns 200 in every case. Only auth problems produce
errors.

### Parse at the boundary: discriminated unions and type guards

TypeScript types are erased at runtime; the backend could send anything. So the
frontend **parses** the response before trusting it. **Type guards** are
functions like `isOpsSummary(value: unknown): value is OpsSummary` that check
every field's shape and tell the compiler "if this returned true, treat it as
that type".

The fetch result is a **discriminated union**, a type with a `kind` tag that
tells you which variant you have:

```ts
type OpsResult =
  | { kind: "ok"; summary: OpsSummary }
  | { kind: "not_configured" | "rejected" | "unavailable" };
```

The page switches on `kind` and renders one specific message per failure. The
compiler won't let you touch `summary` unless `kind === "ok"`.

### CORS is a browser rule, not a firewall

**CORS** (Cross-Origin Resource Sharing) is the browser refusing to let a page
on one origin (say `localhost:3000`) read responses from another
(`localhost:8000`) unless the server allows it. The backend's CORS config allows
only the `Content-Type` header, not `Authorization`. So even if a browser page
somehow had the token, the browser would refuse to send it cross-origin (the
review confirmed a preflight asking for `authorization` gets 400).

But CORS only restrains **browsers**. `curl` ignores it completely, which is
why the bearer token, not CORS, is the real lock on the endpoint.

### Accessible charts

A chart is a picture; a screen reader can't read the curve. Each chart here has
a visible heading, the unit, and a **text line with the latest value**
("Latest: p95: 20.5 s, mean: 15.2 s"). The drawing itself is marked
`aria-hidden`, so assistive tech skips the SVG noise and reads the text, which
carries the same information.

### Independent review

For sensitive changes (auth, secrets, security boundaries), the project's
workflow requires an **independent review**: a fresh reviewer that has never
seen the builder's conversation checks the whole change from scratch. Why? The
builder has the same blind spots while reviewing that it had while building. A
fresh pair of eyes catches different things, and this one did (F-21, below).
The review is bound to an exact commit, so any later code change makes it
stale and requires a new one.

## Architecture

```mermaid
sequenceDiagram
    participant B as Browser
    participant P as proxy.ts (Next.js)
    participant S as /ops page (server component)
    participant A as FastAPI /ops/summary
    participant F as data/*.json(l) files
    participant G as Grafana Cloud (Prometheus API)

    B->>P: GET /ops
    P-->>B: 401 WWW-Authenticate: Basic (no/wrong creds)
    B->>P: GET /ops + Authorization: Basic ...
    P->>S: NextResponse.next()
    S->>A: GET /ops/summary + Authorization: Bearer OPS_API_TOKEN
    par in parallel
        A->>F: read last 10 runs, ingestion status
    and
        A->>G: 5 x query_range (one 5 s deadline, Basic auth read token)
    end
    A-->>S: OpsSummary JSON (each section may be degraded)
    S-->>B: HTML (tiles, table, card) + TrendChart client islands
```

The secrets, and who can see each one:

```text
                OPS_USERNAME/PASSWORD   OPS_API_TOKEN     GRAFANA_PROMETHEUS_TOKEN
browser               typed by user          never               never
Next.js server        checks it              sends it            never
FastAPI backend       never                  checks it           sends it
Grafana Cloud         never                  never               checks it
```

Each secret crosses exactly one boundary.

## What we actually built

### Backend

**[`app/api/ops.py`](../backend/app/api/ops.py)**: the router and the token
check, as a FastAPI **dependency** (a function FastAPI runs before the
endpoint, which can reject the request):

```python
def require_ops_token(settings, authorization: str | None = Header()) -> None:
    if not settings.ops_api_token:
        raise ApiError(503, OPS_NOT_CONFIGURED)
    scheme, _, presented = (authorization or "").partition(" ")
    # compare_digest so the response time doesn't reveal how much of the token matched.
    if scheme.lower() != "bearer" or not secrets.compare_digest(
        presented.encode(), settings.ops_api_token.encode()
    ):
        raise ApiError(401, UNAUTHORIZED, {"WWW-Authenticate": "Bearer"})
```

The endpoint runs the three sections concurrently: the two file reads go to
threads (`asyncio.to_thread`, since file I/O blocks), and the Grafana fetch is
natively async.

**[`app/api/errors.py`](../backend/app/api/errors.py)**: a small `ApiError`
subclass of `HTTPException`. The existing handler derived the error code from
the status alone, and 503 already meant `engine_unavailable`. `ApiError` carries
its own code (`ops_not_configured`) and headers (`WWW-Authenticate`), so the
envelope stays `{"error": {"code", "message", "fields"}}` everywhere.

**[`app/ops/summary.py`](../backend/app/ops/summary.py)**: the response
models and the two file readers. The response models are **slimmer copies** of
the stored ones: `EvaluationRunSummary` drops `attempts` (per-profile detail,
including program clause text) and `IngestionSummary` drops `error` (which can
hold a provider's error message). Only what the page needs crosses the wire.

**[`app/ops/prometheus.py`](../backend/app/ops/prometheus.py)**: the Grafana
client. The PromQL lives in a dict of **fixed strings**, so no request input
ever reaches a query (no injection surface):

```python
async with asyncio.timeout(settings.grafana_query_timeout_seconds):
    results = await asyncio.gather(
        *(_query_range(client, settings, query, start, end, step_seconds)
          for query in _QUERIES.values())
    )
```

Any failure (HTTP error, timeout, malformed body) becomes
`status: "unavailable"`, and the log line carries only the error type and HTTP
status, never the URL, token, or response body.

**[`app/config.py`](../backend/app/config.py)**: `ops_api_token` and the four
`grafana_prometheus_*` / timeout settings. The Grafana read login is
deliberately separate from the OTLP push credentials in `infra/.env`: a token
that can only **read** metrics can't be used to write fake ones.

### Frontend

**[`src/proxy.ts`](../frontend/src/proxy.ts)**: Basic Auth, fail-closed,
constant-time:

```ts
// Hashing first gives equal-length inputs, so timingSafeEqual never leaks the secret's length.
function matches(presented: string, expected: string): boolean {
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(presented), digest(expected));
}
```

**[`src/lib/ops.ts`](../frontend/src/lib/ops.ts)**: the TypeScript mirror
of the response, the type guards, and `fetchOpsSummary()`, which maps every
outcome to the discriminated union: 401 becomes `rejected`, a 503
`ops_not_configured` becomes `not_configured`, and anything else (network
error, 15 s timeout, bad shape) becomes `unavailable`.

**[`src/app/ops/page.tsx`](../frontend/src/app/ops/page.tsx)**: the server
page: `await connection()`, fetch, then either the three sections or one
`OpsUnavailable` alert. It also sets `robots: { index: false }` so search
engines don't list it. [`loading.tsx`](../frontend/src/app/ops/loading.tsx)
shows while the server waits.

**[`src/components/ops/`](../frontend/src/components/ops/)**:

- `OpsHeader`: deliberately not the student `SiteHeader`, so there's no "Check
  eligibility" button on the internal page.
- `EvaluationSummary`: target tiles. A missed target turns red, a met one gets
  a mint dot, and `null` shows "No data" with no met or missed verdict.
- `EvaluationRunsTable`: scrolls sideways inside its own border on narrow
  screens.
- `IngestionHealth`: status, age, and document and chunk counts.
- `TrafficSection` and `TrendChart`: the only client component, using
  **Recharts** (a React charting library built on SVG). It merges several
  series into one row per timestamp, and a missing value stays `undefined`,
  which Recharts draws as a gap.

**[`src/lib/ops-format.ts`](../frontend/src/lib/ops-format.ts)**: the shared
formatters. Timestamps are always shown in UTC with a fixed shape, so the
server's locale can't change the output.

### Things that went sideways

**1. `middleware.ts` no longer exists.** Next.js 16 renamed it to `proxy.ts`.
The repo's `frontend/AGENTS.md` warns that this Next.js differs from older
versions, and the local docs in `node_modules/next/dist/docs/` confirmed the
rename (and that `dynamic = "force-dynamic"` is gone in favor of
`connection()`). Writing from memory would have produced a file Next.js ignores.

**2. No Grafana read token, so a fake Grafana.** The real `ok` path needed a
`metrics:read` token that wasn't available. Instead of skipping it, a tiny
Python HTTP server imitated `query_range` with synthetic sine waves, a NaN
stretch, and an error spike. That exercised the whole chain: backend client,
contract, type guards, and charts. A real Grafana query is still listed as not
verified.

**3. Only one `next dev` per project.** A second dev server on another port
refused to start because the user's own dev server was running. The fix: test
with `next start` (the production server) on port 3010. Catch:
`NEXT_PUBLIC_API_URL` is **baked in at build time**, so the build had to be
redone pointed at the test backend, then rebuilt again at the end with the
normal settings.

**4. The screenshots found two layout bugs.** Headless Chrome screenshots (no
Playwright available) showed:

- Axis labels like "0.060 req/s" wrapping into two colliding lines. Fix: ticks
  show bare numbers, since the caption already names the unit.
- Chart cards overflowing the page. A CSS grid item defaults to
  `min-width: auto`, meaning "never narrower than my content", and a long tool
  name in the text line pushed the card wide. Fix: `min-w-0` plus
  `break-words`.

**5. A false alarm at phone width.** At 390 px, *everything* overflowed, even
plain paragraphs, which can't overflow. Suspicious, so the known-good `/check`
page was screenshotted the same way: also cropped. Headless Chrome has a
minimum window width of about 500 px and crops the screenshot. At 500 px the
page fits. Lesson: before trusting a measurement, test it on something you
already know the answer for (a **control**).

**6. "Latest" could lie.** The first chart version showed the most recent
*non-null* value as "Latest". If the newest point was a gap, it silently showed
an older number with no age attached. The spec review caught it; now "Latest"
is the newest point or "No data".

**7. The per-phase timeout.** Also from review: httpx's 5 s is per phase, not
total (see Key concepts). The overall `asyncio.timeout` deadline was added.

**8. F-21: one bad byte took the page down.** The **independent reviewer**
found that a single byte that isn't valid UTF-8 in either data file made
`read_text(encoding="utf-8")` raise `UnicodeDecodeError`. That error is neither
an `OSError` nor a Pydantic `ValidationError`, so it escaped both `except`
clauses and turned the whole endpoint into a 500. That broke the spec's "never
500 on file problems" rule. (**UTF-8** is the standard way to store text as
bytes; some byte sequences are simply invalid in it, like a torn half-written
character.) The fix:

- Runs are read with `errors="replace"`: a bad byte becomes the `�` replacement
  character, and the rest of the line survives.
- The ingestion reader also catches `UnicodeDecodeError`.

Because code changed after the review passed, the old receipt became stale,
and a second fresh review of the full change passed and closed F-21.

### How we know it works

- **Backend auth** (TestClient and `curl` on a test instance):
  - 401 plus `WWW-Authenticate: Bearer` for no token, a wrong token, and a
    `Basic` scheme.
  - 503 `ops_not_configured` when unset.
  - The right token returns data matching both files.
  - Missing and malformed files degrade as designed.
- **Grafana client** (httpx `MockTransport`):
  - `NaN` and `Inf` become `null`.
  - 401, error status, HTML body, and timeout all give `unavailable`.
  - Logs hold only the error type and status.
  - A closed port returned 200 overall in 2.6 s.
- **Proxy** (`next start`):
  - 401 on `/ops`, on a subpath, with a wrong password, and with a wrong user.
  - 200 with the right credentials.
  - 503 when unset.
  - `/` and `/check` are never prompted.
- **Every page state rendered:** wrong token, unset token, backend down, trends
  not configured, trends unavailable.
- **No secret in the bundle:** a build with marker values found neither in
  `.next/static`.
- **Visual:** headless Chrome screenshots at 1280 px and 500 px, against the
  mock Grafana.
- **Standards:** `ruff check .`, `npm run lint`, `tsc --noEmit`, and
  `npm run build` pass.
- **Reviews:**
  - Two-axis code review (standards and spec).
  - Two independent reviews by fresh subagents. The first raised F-21, and the
    second closed it with no new findings.

## What's next

- **Feature 18, reliability and security.** It fills the gaps this page
  knowingly leaves:
  - Rate limiting, so the password can't be guessed at high speed.
  - Locking CORS to the production origin.
  - Pinning dependencies (a Recharts or Next.js upgrade could shift behavior).
  - Log scrubbing.
- **Feature 19, testing.** The logic listed in the spec as test-worthy gets
  real unit tests once a runner exists: the last-10-runs reader, NaN parsing,
  Basic Auth header parsing, and the type guards.
- **Feature 20, deploy.** Basic Auth only becomes safe over HTTPS, which Vercel
  and Render/Railway provide. The same three env var groups need setting on
  both platforms. The real Grafana query should be verified then.
- **Feature 21, polish.** A real phone check at 390 px, screenshots of `/ops`
  for the README, and perhaps links from `/ops` straight to the Grafana
  dashboards once a dashboard URL setting exists.
