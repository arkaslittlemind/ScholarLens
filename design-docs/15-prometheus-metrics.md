# 15 - Prometheus metrics

## What

Feature 13 gave the backend a diary: one JSON log line per request. Feature 14
gave it an X-ray: a trace per request, showing where the time went inside that
one request. Feature 15 gives it a **dashboard gauge cluster**: numbers that
describe *all* requests at once, sampled over time. How many requests per
minute? What fraction failed? How long does the agent usually take, and how
long does the slowest 5% take? How many Gemini tokens did we burn today? What
was the accuracy of the last evaluation run?

Concretely, the backend now keeps a set of **metrics** in memory (counters,
histograms, and gauges) and every 60 seconds pushes a snapshot of them over
OTLP to the same OpenTelemetry Collector that already receives traces. The
collector then does two things with them:

1. It serves them in **Prometheus format** at `http://localhost:8889/metrics`,
   a plain-text page you can open in a browser.
2. With the opt-in Grafana override, it also forwards them to **Grafana
   Cloud's Prometheus store (Mimir)**, where feature 16's dashboards will
   query them.

The metrics cover HTTP traffic, the agent, LLM calls, token usage, tool calls,
retrieval and web-search latency, plus two "status" groups read from files: the
last ingestion run and the latest evaluation run. As with traces, no student
text ever becomes part of a metric.

## Why

Traces are superb for "what happened to *this* request?" but hopeless for
"how is the service doing?". To answer "is the error rate going up this week?"
from traces alone, you'd have to fetch and count thousands of individual trace
trees. That is slow, expensive, and most tracing backends sample (keep only
some traces), so the counts wouldn't even be right.

Without metrics, ScholarLens has no answers to questions an operator asks
first:

- **Is it up and healthy?** Request rate and error rate, right now.
- **Is it slow?** Not the average (which hides pain) but the 95th percentile.
- **Is the AI behaving?** How often the agent times out vs succeeds, how many
  tool calls it makes, how often it reaches for web search instead of the
  knowledge base.
- **What does it cost?** Token usage over time. With Gemini billed per token
  (roughly Rs 1.5 to 2 per eligibility check at today's prices), this is a
  money metric, not a vanity metric.
- **Is the knowledge base fresh and is quality holding?** When ingestion last
  ran and whether it succeeded; the latest evaluation accuracy and
  hallucination rate.

Features 16 (Grafana dashboards) and 17 (`/ops`) are literally built out of
these numbers. Without feature 15 they'd have nothing to draw.

## Key concepts

### The three pillars: logs, traces, metrics

Observability people talk about three kinds of telemetry. A useful analogy is
a hospital:

- **Logs** are the nurse's notes: timestamped sentences, one per event. Rich,
  but you have to read them.
- **Traces** are a single patient's full chart for one visit: every test, who
  ordered it, how long it took, in order.
- **Metrics** are the numbers on the ward's whiteboard: beds occupied,
  admissions per hour, average wait time. They say nothing about any single
  patient, but you can glance at them and know if the ward is in trouble.

The key property of a metric is that it is **pre-aggregated**. The backend
doesn't store "request 1 took 12 ms, request 2 took 30 ms, ...". It stores
"so far: 2 requests, 42 ms total, and here's how many fell into each latency
bucket". That makes metrics tiny and cheap no matter how much traffic there is,
and it's why they're the right tool for dashboards and alerts.

### A time series

A metric isn't one number; it's a number that changes over time, sampled
periodically. Each sample is `(timestamp, value)`. A sequence of samples for
one metric with one particular set of labels is a **time series**. For
example:

```
scholarlens_tool_calls_total{app_tool_name="search_the_web"}
  10:00  3
  10:01  3
  10:02  5
```

Prometheus (and Mimir, Grafana's hosted version of it) is a **time-series
database**: it's built to store millions of these little sequences and do math
across them.

### Labels (attributes) and cardinality

A **label** (OpenTelemetry calls it an **attribute**) is a key-value tag that
splits one metric into several time series. `scholarlens.tool.calls` with the
label `app.tool.name` becomes two series: one for `retrieve_program_rules` and
one for `search_the_web`. Labels are what let you ask "error rate *for
/eligibility*" instead of just "error rate".

Every distinct combination of label values is a separate series, and each
series costs memory in the collector and storage in Mimir (Grafana Cloud's
free tier limits you by **active series**). The number of distinct series is
called **cardinality**. Low cardinality is good; unbounded cardinality is a
classic way to take down a metrics system.

That gives the golden rule for labels, and it runs through this whole feature:
**a label value must come from a small, fixed set.** Tool name: fine (2
values). Outcome: fine (4 values). HTTP status code: fine (a handful). The
student's state: bad (50+ values, and it's personal data). A request ID or run
ID: terrible (a new series for every request, forever). Anything the *client*
controls: dangerous, because a hostile client can mint new values at will.
(That last one is exactly the bug the independent reviewer found; see F-21
below.)

### Metric instrument types

OpenTelemetry offers a few kinds of **instrument**, the object you record
measurements through. Feature 15 uses three.

**Counter**: a number that only goes up. You call `.add(n)`. Think of a car's
odometer. Its raw value ("12,843 km") isn't interesting on its own; what you
care about is *how fast it's going up*, which Prometheus computes with
`rate()`. Used for: LLM requests, tool calls.

**Histogram**: records a distribution of values, like durations. You call
`.record(value)`. Instead of storing every value, it keeps:

- `count`: how many values were recorded,
- `sum`: their total,
- and a count per **bucket**: how many values were at most 5 ms, at most 10 ms,
  at most 25 ms, and so on.

From these, you get averages (`sum / count`), request rates (`rate(count)`),
and **percentiles**. A percentile such as **p95** means "95% of requests
were faster than this". Percentiles matter because averages lie: if 19 requests
take 1 s and one takes 60 s, the average (about 4 s) describes nobody. The p95
tells you what the unlucky users experience. Prometheus estimates percentiles
from the buckets with `histogram_quantile()`. Used for: HTTP duration, agent
duration, retrieval and web-search duration, token usage.

A neat trick: a histogram's `count` *is* a counter. So the HTTP duration
histogram, split by status code, gives you request count and error rate for
free. We didn't need separate "requests" or "errors" counters.

**Gauge**: a number that can go up or down, a snapshot of "the value right
now". Think of a thermometer or a fuel gauge. Used for: the last ingestion
run's chunk count, the latest evaluation accuracy.

An **observable gauge** is a gauge you don't push values into. Instead you give
it a **callback**, a function the SDK calls at each collection to ask "what's
the value right now?". That's perfect for values that live somewhere else,
like a file on disk: we don't have to notice when the file changes, we just
read it whenever the SDK asks.

### Push vs pull, and why we didn't add `/metrics` to the backend

There are two ways to get metrics from an app into a database:

- **Pull (scrape)**: the app exposes a web page, usually `/metrics`, and
  Prometheus visits it every N seconds. This is Prometheus's native model.
- **Push**: the app sends metrics out on a timer to a receiver.

The "classic" way to do this feature would be the `prometheus_client` Python
library and a `/metrics` endpoint on the FastAPI app. We deliberately didn't:

- The project already had a push pipeline: feature 14's OTLP connection to the
  collector. Adding metrics to it costs **no new dependency** (the OTel SDK
  already includes metrics) and no new moving parts.
- A `/metrics` endpoint on the backend would be a **new public, unauthenticated
  URL**, and endpoint protection is feature 18's job. Not adding it means
  nothing to protect.
- We still get Prometheus format: the collector's `prometheus` exporter turns
  the pushed OTLP metrics into a scrape-able page on port 8889. So "Prometheus
  metrics" is still literally true; it's just the collector, not the app, that
  speaks Prometheus.

The build plan said "push/scrape into Grafana Cloud", so either design fitted.
This one reused what was there.

### OTLP metrics to Prometheus names

OpenTelemetry and Prometheus name things differently, so the collector
translates. The rules (you can see every one of them in the output):

| OTel instrument | Prometheus name | Rule |
| --- | --- | --- |
| `scholarlens.agent.duration`, unit `s` | `scholarlens_agent_duration_seconds` | dots become underscores; unit appended |
| `scholarlens.tool.calls` (counter) | `scholarlens_tool_calls_total` | counters get `_total` |
| `scholarlens.evaluation.eligibility_accuracy`, unit `1` | `..._eligibility_accuracy_ratio` | unit `1` (a fraction) becomes `_ratio` |
| `scholarlens.ingestion.chunks`, unit `{chunk}` | `scholarlens_ingestion_chunks` | units in braces are just annotations, dropped |
| `http.server.duration`, unit `ms` | `http_server_duration_milliseconds` | same rules for library metrics |

A histogram additionally becomes three series families: `_bucket`, `_sum`, and
`_count`. Attributes become labels, with dots turned into underscores
(`app.agent.outcome` becomes `app_agent_outcome`). And the **resource**
attribute `service.name=scholarlens-api` becomes the `job` label, while a
per-process random ID becomes `instance`.

### Provider, reader, exporter: the metrics pipeline in the SDK

This mirrors feature 14's tracing setup, piece for piece:

| Tracing (feature 14) | Metrics (feature 15) | Job |
| --- | --- | --- |
| `TracerProvider` | `MeterProvider` | the factory everything hangs off |
| `Tracer` | `Meter` | what you create instruments from |
| `BatchSpanProcessor` | `PeriodicExportingMetricReader` | decides *when* to send |
| `OTLPSpanExporter` | `OTLPMetricExporter` | decides *how/where* to send |

The **periodic reader** wakes up on a timer (every 60 s by default, set by the
standard env var `OTEL_METRIC_EXPORT_INTERVAL` in milliseconds), asks every
instrument for its current state, runs observable-gauge callbacks, and hands the
snapshot to the exporter. It sends **cumulative** values by default ("total
since the process started"), which is what Prometheus expects; Prometheus
works out the per-interval change itself.

### The proxy meter: instruments that exist before the provider

Our instruments are module-level globals in `telemetry.py`, created when the
module is imported. But the real `MeterProvider` is only installed later, in
`configure_telemetry`, and only if an endpoint is configured. How does that
work?

`metrics.get_meter(...)` called before any provider exists returns a **proxy
meter**. Instruments created from it are proxies too: they do nothing until a
real provider is set, and then they quietly start forwarding to it. If no
provider is ever set (endpoint unset), recording stays a cheap no-op. It's the
same trick feature 14 relied on for its module-level tracer.

### Views: reshaping metrics you didn't write

A **view** is a rule on the `MeterProvider` that changes how an instrument's
data is aggregated or labelled, *without touching the code that records it*.
That matters for metrics produced by libraries (like the FastAPI
instrumentor), whose recording code you don't own. Our one view says: "for
every instrument named `http.server.*`, keep only these three attributes and
drop the rest". It's the fix for F-21.

### RED: the three numbers every service should expose

A widely used rule of thumb for request-driven services is **RED**: **R**ate
(requests per second), **E**rrors (failed requests per second), **D**uration
(how long they take, as a distribution). The single `http_server_duration`
histogram, split by route and status code, gives all three. The
`scholarlens_*` metrics then apply the same idea one layer deeper: to the
agent, and to each dependency it calls.

## Architecture

```
                          backend process (FastAPI)
 ┌──────────────────────────────────────────────────────────────────────────┐
 │  FastAPIInstrumentor ──► http.server.duration  (View: method/route/status)│
 │                                                                          │
 │  EligibilityAgent ─────► scholarlens.agent.duration  {outcome}           │
 │     │                    scholarlens.llm.requests    {model}             │
 │     │   Pydantic AI ───► gen_ai.client.token.usage   {token type, model} │
 │     ├─ tools ──────────► scholarlens.tool.calls      {tool name}         │
 │     ├─ DocumentRetriever► scholarlens.retrieval.duration  {outcome}      │
 │     └─ WebSearchClient ─► scholarlens.web_search.duration {outcome}      │
 │                                                                          │
 │  status_metrics (observable gauges, read at each collection)             │
 │     data/ingestion-status.json   ──► scholarlens.ingestion.*             │
 │     data/evaluation-runs.jsonl   ──► scholarlens.evaluation.*            │
 │                     │                                                    │
 │   MeterProvider ── PeriodicExportingMetricReader (every 60 s)            │
 │                     └── OTLPMetricExporter (gRPC, 5 s timeout)           │
 └─────────────────────────────┬────────────────────────────────────────────┘
                               │ OTLP :4317 (same connection style as traces)
                               ▼
                 ┌─────────────────────────────┐
                 │   OpenTelemetry Collector   │
                 │  metrics pipeline:          │
                 │   otlp ─► batch ─► exporters│
                 └───────┬───────────────┬─────┘
                         │               │ only with docker-compose.grafana.yml
                         ▼               ▼
        http://localhost:8889/metrics   Grafana Cloud (Mimir / Prometheus)
        (Prometheus text format)        ──► feature 16 dashboards, feature 17 /ops
```

Two design points the diagram shows:

- **Everything funnels through one `MeterProvider`**, including metrics we
  didn't write (FastAPI's HTTP metrics, Pydantic AI's token histogram). Setting
  the provider is what switches them all on.
- **The CLIs don't feed live metrics.** `python -m app.ingestion` and
  `python -m app.evaluation` run in their own processes and never call
  `configure_telemetry`, so their agent runs aren't counted as live traffic
  (an evaluation run of 25 profiles would otherwise look like a traffic spike).
  Their *results* reach metrics indirectly: they write the record files that
  the status gauges read.

## What we actually built

### The switch: [`app/telemetry.py`](../backend/app/telemetry.py)

`configure_tracing` became `configure_telemetry`, because it now sets up both
signals. When `OTEL_EXPORTER_OTLP_ENDPOINT` is unset it still returns
immediately, so local runs without a collector stay no-ops. When it's set:

```python
resource = Resource.create({"service.name": SERVICE_NAME, "service.version": app.version})
...
metrics.set_meter_provider(
    MeterProvider(
        resource=resource,
        views=[
            View(
                instrument_name="http.server.*",
                attribute_keys={"http.method", "http.target", "http.status_code"},
            )
        ],
        metric_readers=[
            PeriodicExportingMetricReader(
                OTLPMetricExporter(
                    endpoint=settings.otel_exporter_otlp_endpoint,
                    timeout=settings.otel_export_timeout_seconds,
                )
            )
        ],
    )
)
# After the meter provider, so the instrumentor records request metrics against it.
FastAPIInstrumentor.instrument_app(app, excluded_urls="/health$", exclude_spans=["receive", "send"])
```

Details worth noticing:

- **The same `Resource` for traces and metrics**, so both carry
  `service.name=scholarlens-api` and line up in Grafana.
- **Order matters.** `FastAPIInstrumentor` grabs the meter provider when it
  instruments the app. Set the provider after that and HTTP metrics silently
  go to the no-op provider forever.
- **The export timeout is reused** (`otel_export_timeout_seconds`), keeping the
  project rule that every external call has an explicit timeout. No new
  setting was added for the export interval; the standard
  `OTEL_METRIC_EXPORT_INTERVAL` env var already does it.
- **`/health` stays excluded**, for the same reason as in feature 14: the
  Compose healthcheck hits it every 10 seconds and would dominate the request
  counts.

The app's own instruments live at module level in the same file:

```python
_meter = metrics.get_meter("scholarlens")

agent_duration = _meter.create_histogram(
    "scholarlens.agent.duration", unit="s", description="Duration of one eligibility agent run."
)
llm_requests = _meter.create_counter("scholarlens.llm.requests", unit="{request}", ...)
tool_calls = _meter.create_counter("scholarlens.tool.calls", unit="{call}", ...)
retrieval_duration = _meter.create_histogram("scholarlens.retrieval.duration", unit="s", ...)
web_search_duration = _meter.create_histogram("scholarlens.web_search.duration", unit="s", ...)
```

Durations are in **seconds**, the OTel and Prometheus convention (the HTTP
histogram is in milliseconds only because the instrumentor's default semantic
conventions say so; see "Things that went sideways" below).

### The agent: [`app/agent/agent.py`](../backend/app/agent/agent.py)

`check_eligibility_measured` already had one `except` branch per failure kind
(from features 5 and 14). The metric slots into each branch through a tiny
closure:

```python
started = time.perf_counter()

def record(outcome: str) -> None:
    agent_duration.record(time.perf_counter() - started, {"app.agent.outcome": outcome})

try:
    ...  # run the agent under asyncio.wait_for
except TimeoutError as exc:
    record("timeout")
    ...
except (RetrievalUnavailableError, WebSearchUnavailableError) as exc:
    record("tool_unavailable")
    ...
except Exception as exc:
    record("error")
    ...

record("success")
llm_requests.add(run_result.usage.requests, {"gen_ai.request.model": self._model_name})
```

So a single histogram answers both "how long do agent runs take?" and "how do
they end?". `time.perf_counter()` is the right clock for durations: it's
monotonic (never jumps backwards when the system clock is adjusted) and
high-resolution.

`llm_requests` reads the run's usage summary, which counts model requests (a
typical check makes 3 to 4: decide to retrieve, maybe retrieve again or search,
then answer). It is only recorded for completed runs, because a failed run
never hands back a usage object. That's an accepted gap: the spec says "token
usage where available".

Each tool function also bumps the tool-call counter, right beside the existing
`ctx.deps.tool_calls += 1` (which feeds the evaluation pipeline's per-attempt
count):

```python
tool_calls.add(1, {"app.tool.name": "retrieve_program_rules"})
```

**Token usage needed no new code.** Feature 14 turned on Pydantic AI's
`Instrumentation` capability for spans. It turns out that capability also
records a `gen_ai.client.token.usage` histogram against the *global* meter
provider, following the OTel GenAI semantic conventions (confirmed by reading
`pydantic_ai/models/instrumented.py`). The moment feature 15 installed a real
meter provider, token metrics appeared, split by `gen_ai_token_type="input"`
and `"output"`. We deliberately didn't add a second, duplicate token counter.
The first live request showed 4,456 input and 1,964 output tokens across 3
model responses, which is where the cost estimate came from.

### Retrieval and web search: [`app/retrieval/client.py`](../backend/app/retrieval/client.py), [`app/tools/web_search.py`](../backend/app/tools/web_search.py)

Both use the same shape: assume failure, upgrade on success, record in
`finally` so every exit path is covered.

```python
started = time.perf_counter()
outcome: str | None = "error"
try:
    ...
    outcome = "success"
    return chunks
except asyncio.CancelledError:
    # The agent's run timeout cancels an in-flight call; that is not a dependency failure.
    outcome = None
    raise
except TimeoutError as exc:
    outcome = "timeout"
    raise RetrievalUnavailableError("ChromaDB query timed out") from exc
except Exception as exc:
    raise RetrievalUnavailableError("ChromaDB query failed") from exc
finally:
    if outcome is not None:
        retrieval_duration.record(time.perf_counter() - started, {"app.outcome": outcome})
```

Defaulting to `"error"` is a safety habit: if some unexpected path escapes,
it's counted as a failure rather than silently vanishing. The
`CancelledError` branch came from the independent review (F-22, below).

In `WebSearchClient`, the old `search` body moved into `_search`, and `search`
became a thin wrapper that times it. That was simpler than threading an
outcome variable through `_search`'s two nested `try` blocks and early
`raise` for a missing API key. A missing key counts as `error`.

### The status gauges: [`app/status_metrics.py`](../backend/app/status_metrics.py)

This is the one genuinely new module. It turns two record files into gauges:

| File (written by) | Gauges |
| --- | --- |
| `data/ingestion-status.json` (`python -m app.ingestion`) | `last_run_success` (1/0), `last_run_timestamp` (Unix seconds), `chunks` |
| last line of `data/evaluation-runs.jsonl` (`python -m app.evaluation`) | `eligibility_accuracy`, `citation_accuracy`, `hallucination_rate`, `consistency_score`, `latency` (ms), `tool_calls`, `last_run_timestamp` |

Every gauge is built by one helper:

```python
def _gauge(name, unit, description, read, value) -> None:
    # A missing or malformed record, or a null field, publishes no series rather than a
    # made-up zero; dashboards read the absence as "no data yet".
    def callback(_options: CallbackOptions) -> Iterable[Observation]:
        record = read()
        if record is None:
            return []
        observed = value(record)
        return [] if observed is None else [Observation(observed)]

    _meter.create_observable_gauge(name, callbacks=[callback], unit=unit, description=description)
```

Design decisions in here:

- **Absence, not zero.** If ingestion has never run, publishing
  `last_run_success = 0` would claim "ingestion failed", which is false.
  Publishing nothing lets a dashboard say "no data". The same goes for null
  fields: the current evaluation run has `hallucination_rate = null` (no
  clause-bearing verdicts to judge), so that gauge simply doesn't appear. A
  zero there would read as "perfect, no hallucinations".
- **Callbacks must never raise.** They run inside the SDK's background reader
  thread; an exception there gets logged on every collection, forever. So the
  readers catch `OSError` (file missing or unreadable) and `ValueError`
  (malformed JSON; Pydantic's `ValidationError` is a subclass) and return
  `None`.
- **Re-read on every collection**, so a new evaluation run shows up within one
  export interval with no restart. Reading the whole runs file each time is
  wasteful in principle (the reviewer noted it), but the file is small and
  append-only; it's a cost to revisit only if it grows large.
- **Parse with the real models.** `IngestionStatus` and `EvaluationRun` are the
  same Pydantic models the CLIs write with, so the gauges can't drift from the
  file format silently.

Why a separate module instead of adding this to `telemetry.py`? **An import
cycle.** `telemetry.py` is imported by `retrieval/client.py` (for spans and
now histograms). The ingestion pipeline imports `retrieval/client.py` (to
share the embedding function). If `telemetry.py` imported `IngestionStatus`
from the ingestion pipeline, Python would hit a loop: telemetry ▸ ingestion ▸
retrieval ▸ telemetry, with names not yet defined. Putting the gauges in a
module that only [`main.py`](../backend/app/main.py) imports, after everything
else is loaded, breaks the loop:

```python
configure_telemetry(settings, app)
register_status_gauges(settings)
```

### The collector: [`infra/`](../infra/)

In [`otel-collector-config.yaml`](../infra/otel-collector-config.yaml), a
`prometheus` exporter was added, and the metrics pipeline now uses it instead
of `debug`:

```yaml
exporters:
  # Serves metrics in Prometheus format at http://localhost:8889/metrics for local checks.
  prometheus:
    endpoint: 0.0.0.0:8889
...
    metrics:
      receivers: [otlp]
      processors: [batch]
      # Not debug: a detailed metric dump every export interval would bury the trace output.
      exporters: [prometheus]
```

[`docker-compose.yml`](../infra/docker-compose.yml) publishes port `8889`. The
Grafana override fragment
[`otel-collector-grafana.yaml`](../infra/otel-collector-grafana.yaml) adds one
pipeline line, reusing the exporter and credentials feature 14 already set up
for Tempo:

```yaml
    metrics:
      exporters: [prometheus, otlp_http/grafana]
```

Grafana Cloud's OTLP gateway accepts all three signals at one endpoint, so the
same `otlp_http/grafana` exporter that sends traces to Tempo sends metrics to
Mimir. No new credentials.

### The independent review's findings

The first independent review passed, but raised two issues. You chose to fix
both before completing.

**F-21 (P2): a label the client controls.** The FastAPI instrumentor doesn't
just label HTTP metrics with method, route, and status. It also adds
`http.server_name`, which it takes from the request's **`Host` header**, plus
`http.host`, `net.host.port`, `http.scheme`, and `http.flavor`. The `Host`
header is chosen by whoever sends the request. The reviewer sent five requests
with five made-up `Host` values and got five separate series. A script could
send millions, creating millions of series: memory growth in the collector and
a blown active-series quota in Grafana Cloud. It broke the spec's own "fixed
values only" rule for labels.

The fix is the view shown earlier. Afterwards, four requests with four
different `Host` headers produced exactly one series:

```
http_server_duration_milliseconds_count{http_method="GET",http_status_code="200",http_target="/",job="scholarlens-api",...} 4
```

The lesson: **auto-instrumentation brings attributes you didn't choose**, and
for metrics, every attribute is a cardinality decision. Feature 14's review
flagged a cousin of this for spans (`net.peer.ip`, `http.user_agent`); spans
are per-request anyway, so there it's a privacy question rather than a
cardinality one.

**F-22 (P3): timeouts blamed on the wrong component.** When the agent's
45-second budget runs out, `asyncio.wait_for` **cancels** the agent task. If a
retrieval or web search was mid-flight, Python raises `asyncio.CancelledError`
inside it. `CancelledError` is a `BaseException`, not an `Exception`, so
neither `except TimeoutError` nor `except Exception` caught it, and the
`finally` block recorded the default outcome: `"error"`. Feature 16's
"ChromaDB error rate" panel would have spiked every time *Gemini* was slow,
pointing you at the wrong system at 2 am.

The fix: catch `CancelledError`, set the outcome to `None`, re-raise (you must
always re-raise a cancellation, or the task can't be cancelled), and skip
recording when there's no outcome. The agent's own histogram still records
`timeout`, which is where the blame belongs. An in-process probe confirmed a
cancelled call now records nothing while a genuinely failing call still
records `error`.

A second, fresh reviewer then re-reviewed the entire branch and closed both
findings.

### Things that went sideways

- **The 500 from a library upgrade.** The spec said to use
  `run_result.usage().requests` and to "confirm `usage` is a method on the
  installed 2.44". It was, in the local virtualenv. But the Docker image
  installs dependencies fresh from `pyproject.toml`'s `>=2.44` floor, and it
  got **pydantic-ai 2.51**, where `usage` had become a *property*. Calling a
  property's result like a function raised `TypeError`, and the first live
  eligibility request returned a 500 (after a successful agent run and a
  real Gemini bill). The fix was one character (`usage().requests` became
  `usage.requests`) plus raising the floor to `>=2.51` in both
  `pyproject.toml` and `requirements.txt`, so the code and the minimum
  version agree, and the local venv was upgraded to match. This is the same
  class of problem as feature 14's `instrument=` crash: unpinned dependencies
  moving under you. Feature 18 owns pinning.
- **Old-style HTTP metric names.** OpenTelemetry's HTTP semantic conventions
  were revised: the new name is `http.server.request.duration` in seconds. The
  installed instrumentor still emits the *old* `http.server.duration` in
  milliseconds by default, unless you set `OTEL_SEMCONV_STABILITY_OPT_IN=http`.
  We didn't flip that switch, because it would also rename the span attributes
  feature 14 shipped (`http.method` becomes `http.request.method`, and so on).
  The spec's contract table records the old name, so dashboards query what
  actually exists.
- **"Duplicate" series after a restart.** After restarting the backend,
  `curl :8889/metrics` showed two copies of each series. They weren't
  duplicates: each process start gets a new random `instance` label, and the
  collector's Prometheus exporter keeps a series for about 5 minutes after it
  stops updating. In Grafana you'd sum across instances, so it's harmless, but
  it's confusing the first time you see it.
- **Waiting 60 seconds per check is painful.** Every local verification used a
  throwaway Compose override (kept in the session scratchpad, not the repo)
  setting `OTEL_METRIC_EXPORT_INTERVAL=5000`. The README documents this tip.

### How we know it works

- `ruff check .` after every change.
- **HTTP metrics (no Gemini cost):** `GET /`, a 404, and several `/health`
  hits produced `http_server_duration_milliseconds_*` for `/` with
  `http_status_code="200"`, a 404 series with **no** `http_target` (unmatched
  paths don't get a route label, which also caps cardinality), and nothing for
  `/health`.
- **Agent path (one real request):** a question about the Fulbright program
  produced agent `success`, `llm_requests_total=3`, one retrieval, one web
  search, and the token histogram. Marker words planted in the request
  (`zebrafinch`, the state, the major) appeared 0 times in the metrics output.
- **Failure path:** with `docker compose stop chromadb`, the API returned the
  controlled 503, and the metrics showed agent `tool_unavailable` and
  retrieval `timeout`.
- **Status gauges:** in-process with an `InMemoryMetricReader` (a reader that
  keeps metrics in a Python object instead of exporting them) and live on
  `:8889`, values matched the files exactly (eligibility accuracy 0.68, 23
  chunks, and so on). Moving the evaluation file away, or appending a
  malformed line, removed that group's series without an error.
- **Grafana override:** the merged Compose config rendered with both collector
  config files, and with real credentials the collector logged no export
  errors. The series have not yet been checked in Grafana Cloud's UI.
- **Two independent reviews**, the second covering the full branch after the
  fixes, both passed.
- **Not covered:** the project has no test runner yet, so none of this is an
  automated regression test.

## What's next

- **Feature 16, Grafana dashboards:** the contract table in the archived spec
  is now the query vocabulary. Service health is RED from
  `http_server_duration_milliseconds` (for example
  `sum(rate(..._count{http_status_code=~"5.."}[5m])) / sum(rate(..._count[5m]))`
  for error rate, `histogram_quantile(0.95, ...)` for p95). AI quality is
  agent outcomes, tool mix (how often `search_the_web` fires), tokens per
  request, and the `scholarlens_evaluation_*` gauges plotted over time for
  trends. The first step there is confirming the series actually arrive in
  Grafana Cloud.
- **Feature 17, `/ops`:** can embed those Grafana panels, or read a small
  summary endpoint. If it's an endpoint, it's the first new backend URL that
  exposes operational data, and it needs the protection feature 18 brings.
- **Feature 18, reliability and security:** pin dependencies (twice now an
  unpinned library changed shape mid-feature), pin the collector image instead
  of `:latest` (the Prometheus name translation lives in the collector), and
  rate limiting, which also protects your Gemini credits.
- **Feature 19, testing:** the status-file parsing is the first piece of logic
  that begs for unit tests (valid, missing, malformed, null fields), and the
  outcome labelling in the agent and clients can be tested with fake clients
  and an `InMemoryMetricReader`, with zero Gemini cost.
- **Feature 20, deploy:** Render won't run the collector container, so the
  deployed backend will either export OTLP straight to Grafana Cloud or run a
  collector alongside it. The app code doesn't change either way; that's the
  payoff of pushing through a collector. The status gauges assume the record
  files live next to the running app, which will need a decision once
  ingestion and evaluation run somewhere other than a laptop.
- **Feature 22, provider rate-limit handling:** a natural home for one more
  counter, provider errors by kind (quota vs overload), so you can see quota
  exhaustion on a dashboard before students do.
