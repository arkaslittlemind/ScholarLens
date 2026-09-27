# 16 - Grafana dashboards

## What

Feature 15 taught the backend to *count*: every request, agent run, tool call,
token, and evaluation score became a number pushed to Grafana Cloud every few
seconds. But a pile of numbers in a database is like a car's sensor readings
stored in a spreadsheet nobody opens. Feature 16 builds the **instrument
panel**: two Grafana dashboards that turn those stored numbers into graphs and
big-number tiles a human can read at a glance.

- **Service health** answers "is the service OK?": how many requests per
  second, what fraction failed, how slow `/eligibility` is, how the agent's runs
  are ending, and whether ChromaDB and Tavily are slow or failing.
- **AI quality** answers "is the AI any good, and what is it costing?": the
  latest evaluation scores, how they trend against the project's targets
  (eligibility above 80%, citation above 70%, hallucination below 10%), which
  tools the agent calls, how many LLM requests it makes, and how many tokens it
  burns.

Both live in the repo as JSON files in
[`infra/grafana/dashboards/`](../infra/grafana/dashboards/). You import them
into Grafana Cloud by hand; re-importing replaces the old copy. No backend code,
collector config, or Docker service changed. This feature is pure "reading
side": every query runs against metrics feature 15 already ships.

## Why

Metrics nobody looks at are worth nothing. Without dashboards, answering "did
the error rate spike last night?" means opening Grafana's Explore page, typing
PromQL from memory, and remembering which label holds the status code. Nobody
does that routinely, so problems go unnoticed until a user complains.

Dashboards fix three concrete costs:

1. **Time to answer.** A maintainer (or an interviewer looking at the project)
   opens one URL and sees health and quality in five seconds, instead of
   writing a dozen queries.
2. **Consistency.** The queries are written once, reviewed, and saved. Two
   people looking at "error rate" see the same definition (5xx only, 4xx
   excluded), not two slightly different hand-typed ones.
3. **Trends.** The evaluation pipeline (feature 7) writes one number per run to
   a file. Only a dashboard, reading those numbers from a time-series database,
   shows whether quality is *improving or regressing over weeks*, which is the
   whole point of running evaluations repeatedly.

And for this project specifically: the build plan calls observability "the
productionization headline". Traces and metrics are invisible plumbing; the
dashboards are the part you can screenshot and show.

## Key concepts

### What a dashboard is (and what Grafana is)

**Grafana** is a web app whose only job is to *ask a database a question and
draw the answer*. It stores no metrics itself. You point it at a **data
source** (here, Grafana Cloud's Prometheus-compatible store, Mimir) and it runs
queries against it.

A **dashboard** is a saved page of **panels**. Each panel is:

- one or more **queries** (PromQL expressions, here),
- a **visualization** type that decides how to draw the result, and
- **field config**: the unit, the colours, the thresholds.

Analogy: the database is a library, a query is a question to the librarian, and
a dashboard is a laminated sheet of your twelve favourite questions with a
chart next to each answer, refreshed every minute.

### Dashboards as code (the JSON model)

Every Grafana dashboard is, underneath, a JSON document. Grafana's UI edits
that JSON for you; "Export" gives it back. Committing that JSON to the repo
means:

- the dashboards are **versioned and reviewable** like code (the spec reviewer
  actually checked threshold directions and PromQL in a diff),
- they can be **recreated** on any Grafana stack in one import, and
- nobody's hand-tweaked panel silently becomes the "real" definition.

Two fields matter for re-importing:

- **`uid`**: the dashboard's stable identity (`scholarlens-service-health`).
  Import a file whose `uid` already exists and Grafana *overwrites* instead of
  creating "Service health (1)". Think of it as a primary key.
- **No dashboard `id` or `version`**: those are Grafana's internal row number
  and edit counter for one particular stack. Leaving them out keeps the file
  portable.

### Stat panels vs time-series panels

- A **time series** panel draws a line over the dashboard's time range: "how
  did request rate move over the last 6 hours?"
- A **stat** panel shows one big number, usually the latest value (the
  `reduceOptions.calcs: ["lastNotNull"]` setting): "what is the error ratio
  right now?"

The pattern used in both dashboards is a top row of stats (the headline
numbers) and time-series panels below (the story behind them).

### Template variables, and the data-source variable

A **template variable** is a dropdown at the top of a dashboard whose value
gets substituted into panel queries wherever `$name` or `${name}` appears.
Classic uses: pick an environment, pick a host.

Here there is exactly one, of the special type `datasource`:

```json
{ "name": "datasource", "label": "Data source", "type": "datasource", "query": "prometheus" }
```

It lists every Prometheus data source on the stack, and every panel says
`"datasource": {"type": "prometheus", "uid": "${datasource}"}`. Why bother?
Because every Grafana stack gives its Prometheus data source a **different
random UID**. A dashboard exported with a hard-coded UID only works on the
stack it came from; importing elsewhere triggers a "map this data source"
prompt or silently broken panels. The variable makes the file stack-agnostic:
import, pick the data source in the dropdown, done.

The catch (found after merge, see "Things that went sideways"): variables are
resolved **in the browser**. Anything that runs queries on the server without a
browser, such as Grafana's *public dashboards*, sees the literal text
`${datasource}` and fails.

### PromQL refresher, and the functions these dashboards lean on

Feature 15's doc introduced counters, histograms, gauges, `rate()` and
`histogram_quantile()`. Quick recap plus the new pieces:

- **`rate(counter[window])`**: per-second increase of a counter, averaged over
  the window. Counters only go up (and reset to 0 on process restart); `rate`
  turns "total so far" into "how fast right now", and handles resets.
- **`increase(counter[window])`**: `rate × window length`, i.e. "how many
  happened in this window". Used for totals like "tokens in range".
- **`sum by (label) (...)`**: collapse many series into one per value of
  `label`, e.g. one line per HTTP status code, adding up across backend
  instances.
- **`histogram_quantile(0.95, sum by (le) (rate(x_bucket[w])))`**: estimate the
  95th percentile from histogram buckets. The `sum by (le)` keeps the bucket
  boundary label (`le` = "less than or equal") while merging everything else.
- **`$__rate_interval`**: a Grafana-provided window that is always long enough
  to contain at least a few scrapes, whatever the zoom level. Hand-picking
  `[1m]` breaks when you zoom out to 7 days (the step is bigger than the
  window, so points are skipped) or when scrapes are sparse.
- **`$__range`**: the whole selected time range. Used by stats like "mean
  latency over the selected range".
- **`x or vector(0)`**: "if `x` returns nothing, use 0 instead". Explained in
  the next section, because *when* to use it is the most subtle decision in
  this feature.

### "No data" vs 0: absence is information

In Prometheus, a series that was never written simply **does not exist**. A
query over it returns nothing, and Grafana shows "No data". That is different
from a series whose value is 0.

This matters in two opposite directions:

- **Error ratios should read 0, not "No data".** If the backend served 100
  requests and none failed, there is no `http_status_code="503"` series at all,
  so `sum(rate(...5xx...))` returns nothing and the ratio shows "No data". A
  reader can't tell "no errors" from "broken dashboard". Fix: wrap the
  numerator, `(sum(rate(5xx)) or vector(0)) / sum(rate(all))`. When there *is*
  traffic, you get `0 / x = 0`. When there is *no* traffic at all, the
  denominator is empty, so the whole expression is still "No data", which is
  honest: no traffic, no ratio.
- **Quality gauges must stay "No data", never 0.** The evaluation's
  `hallucination_rate` is `null` when the run couldn't judge hallucination, and
  feature 15 publishes *no series* in that case. Showing 0% hallucination there
  would be a lie that looks like great news. So quality queries have no
  `or vector(0)`.

Rule of thumb: fall back to 0 only when "nothing recorded" genuinely *means*
zero.

### Thresholds: turning numbers into colours

A **threshold** is a list of (value, colour) steps. A stat whose value crosses
0.8 turns from red to green; a time series can draw the threshold as a line
plus shaded area (`thresholdsStyle: "line+area"`). The direction matters:
accuracy is good *above* its target, hallucination is good *below* it, so the
steps are mirrored:

```text
Eligibility accuracy:  red  -> 0.8 -> green        (want high)
Hallucination rate:    green -> 0.1 -> red         (want low)
```

### Units

Grafana formats values by **unit** id: `percentunit` shows 0.68 as "68%",
`ms` and `s` show durations, `reqps` is requests per second, `opm` is
operations per minute, and `dtdurations` shows 256253 seconds as "2 days 23
hours". Picking the unit is what makes a panel readable without a legend.

### Why a trend line from a "latest value" gauge works

The evaluation gauges only ever hold the **latest** run's numbers. So how can
there be a trend? Because Mimir stores every sample it receives. The backend
re-reads `evaluation-runs.jsonl` at every metric export and pushes, say, 0.68.
Two minutes later, 0.68 again. After a new evaluation run, 0.74. Plotted over
time, that is a flat line that **steps** at each new run, with gaps whenever
the backend (the thing doing the reporting) was down. The database turns
repeated snapshots into history, no extra storage code needed.

## Architecture

```text
 backend (FastAPI + agent)                        feature 15
   counters / histograms / gauges in memory
        |  OTLP push every export interval
        v
 OpenTelemetry Collector  ----> :8889 /metrics  (local, no history)
        |  otlp_http/grafana (only with docker-compose.grafana.yml)
        v
 Grafana Cloud Mimir  (Prometheus-compatible time-series store)
        ^
        |  PromQL, one query per panel target
        |
 Grafana (Cloud UI)                                feature 16
   +-- ScholarLens - Service health   uid scholarlens-service-health
   |     API row:        request rate, 5xx ratio, 4xx rate, mean latency,
   |                     by route, by status, latency mean/p50/p95/p99, error ratio
   |     Agent row:      runs by outcome, run duration, ChromaDB, Tavily
   +-- ScholarLens - AI quality       uid scholarlens-ai-quality
         Latest run:     eligibility, citation, hallucination, consistency,
                         eval avg latency / tool calls, time since last run
         Trends:         the three target metrics with threshold lines
         Live usage:     tool calls, calls per run, LLM requests, tokens
        ^
        |  one-time manual import of the JSON from infra/grafana/dashboards/
```

Note what is *not* here: no local Grafana or Prometheus container. The
collector's `:8889` endpoint only shows the *current* values, so local history
would need a Prometheus server to scrape and store it. The plan says Grafana
Cloud, and Mimir already stores history, so adding two containers would have
been infrastructure for a need nobody had.

## What we actually built

### The two files

- [`infra/grafana/dashboards/service-health.json`](../infra/grafana/dashboards/service-health.json)
  (12 panels in 2 rows)
- [`infra/grafana/dashboards/ai-quality.json`](../infra/grafana/dashboards/ai-quality.json)
  (16 panels in 3 rows)

Both share: tag `scholarlens`, default range "last 6 hours", 1-minute
auto-refresh, the `datasource` variable, and a `job="scholarlens-api"` filter
in every query. `job` is the label the collector derives from the OTel resource
attribute `service.name`, the same name the traces use.

A representative panel, the 5xx ratio stat:

```json
{
  "type": "stat",
  "title": "5xx error ratio",
  "datasource": { "type": "prometheus", "uid": "${datasource}" },
  "targets": [{
    "expr": "(sum(rate(http_server_duration_milliseconds_count{job=\"scholarlens-api\",http_status_code=~\"5..\"}[$__rate_interval])) or vector(0)) / sum(rate(http_server_duration_milliseconds_count{job=\"scholarlens-api\"}[$__rate_interval]))"
  }],
  "fieldConfig": { "defaults": { "unit": "percentunit",
    "thresholds": { "steps": [ {"color": "green", "value": null},
                               {"color": "orange", "value": 0.01},
                               {"color": "red", "value": 0.05} ] } } }
}
```

Reading the expression inside out: take the request-count part of the HTTP
histogram (`_count`), keep only statuses matching the regex `5..`, compute a
per-second rate, add across all series, fall back to 0 if none, and divide by
the same rate over *all* statuses.

### Design decisions worth remembering

- **4xx is not an error.** A 422 means the *client* sent a bad request (empty
  description, negative GPA). Counting it as a service error would page someone
  for a user's typo. So 5xx gets a ratio with red thresholds; 4xx gets its own
  neutral "4xx rate" stat.
- **Mean latency next to the percentiles.** See "Things that went sideways";
  the percentiles lie above 10 s, the mean doesn't.
- **Failure ratio on the latency panel's right axis.** The ChromaDB and Tavily
  panels plot p95 latency (seconds) and failure ratio (0-1) together. A field
  **override** gives the "failure ratio" series its own unit and a right-hand
  axis, so a 0.5 ratio isn't squashed against a 4-second latency scale.
- **`max(...)` around evaluation gauges.** Each backend process has its own
  `instance` label; after a restart there are briefly two series for the same
  gauge. `max` collapses them into one line (they hold the same file's value).
- **Tool calls per run divides by *all* runs.** The spec first said "per
  completed run". But a tool-call counter has no idea how its run ended, so
  dividing all tool calls by *successful* runs would overstate the average.
  The review caught the mismatch; the spec was corrected rather than the query.
- **Panel descriptions carry the caveats.** Hover the "i" on a panel and it
  tells you, for example, that LLM requests count completed runs only (a failed
  run reports no usage), while tokens are recorded per model response and so
  include failed runs.

### How the JSON was made

The JSON was produced by a throwaway Python generator (helper functions like
`stat(...)`, `timeseries(...)`, `quantile(0.95, metric)`) and then committed as
plain dashboard JSON; the generator was deliberately not committed. The
standards review flagged the trade-off: editing ~1,900 lines of JSON by hand
later is tedious. The choice was that the JSON is the source of truth (it is
what Grafana imports and exports), and a generator would be a second artifact
to keep in sync for two dashboards that change rarely.

### [`README.md`](../README.md)

A "Dashboards" subsection under the observability section: where the files
live, the import path (Dashboards > New > Import, then pick the data source),
that panels only fill while the Grafana override runs, and the three reading
caveats (flat-then-stepping trends, the 10 s percentile cap, the `rate()`
first-sample blind spot).

### Things that went sideways

**1. Percentiles flat-lined at exactly 10000 ms.** The first local probe showed
`/eligibility` p50, p95 and p99 all equal to 10000 ms, which is suspicious for
requests that took 10 to 42 s. The raw exposition explained it:

```text
le="0" le="5" le="10" ... le="5000" le="7500" le="10000" le="+Inf"
```

The HTTP histogram uses the OpenTelemetry SDK's **default bucket boundaries**,
which stop at 10 000 ms. Every request slower than that lands in the `+Inf`
bucket, and `histogram_quantile` cannot interpolate inside an infinite bucket,
so it returns the highest finite boundary: 10 s. A histogram only knows "how
many values fell between these edges"; if all your values are past the last
edge, it knows nothing about them.

Fixing it means an explicit-bucket **View** in the backend's `telemetry.py`,
which the spec put out of scope ("do not change instruments to fit a panel").
So the dashboard adds an **exact mean** from `_sum / _count` (sums don't care
about buckets), the panel description says percentiles cap at 10 s, and the fix
is queued as a follow-up `/fix`.

**2. The first 503 was invisible.** The probe sent a 503 (ChromaDB stopped),
and the exposition showed `http_status_code="503"` with count 1, yet the 5xx
panel stayed empty. The cause is a Prometheus fundamental: `rate()` needs **two
samples** to compute a slope. A brand-new series whose first-ever sample is
already 1 has no "before" value, so that first increment is invisible. The
second 503 showed up at once (ratio 0.5). This hits the first occurrence of
every new label combination after a backend restart: first 422, first
retrieval timeout, and so on. It can't be fixed from the dashboard side, so it's
documented in the panel descriptions and README.

**3. "No data" where 0 belonged.** Same probe: the 5xx ratio showed "No data"
while traffic was flowing, because no 5xx series existed yet. That's where the
`or vector(0)` numerator rule came from (see Key concepts).

**4. The public dashboard link returned 500 on every panel.** After merge, the
Service health dashboard was shared as a Grafana *public dashboard*. Its panel
query API answered HTTP 500 for all 12 panels. The saved dashboard showed why:
every panel's data source was the literal `${datasource}`, and the variable's
`current` value was empty. Public dashboards run queries on the server and
don't support template variables, so there's no browser to fill in the
placeholder. The AI quality *snapshot* had worked fine because a snapshot saves
already-rendered data. The fix was to share Service health as a snapshot too,
not to hard-code a stack-specific UID into the repo JSON (which would break the
"imports anywhere" property).

### How we know it works

- `python -m json.tool` on both files: valid JSON.
- **Local import and query probe:** a throwaway Prometheus scraping the
  collector's `:8889` and a throwaway Grafana (both deleted afterwards). Both
  files imported through `/api/dashboards/import` with `inputs: []` (no
  data-source mapping); a second import overwrote them, leaving exactly two
  dashboards tagged `scholarlens`. Every panel's query was run through Grafana's
  `/api/ds/query` with no errors after traffic of 3 × 200, 2 × 422, and
  2 × 503. The values matched: 5xx ratio 0.5 while the second 503 was in the
  window, 422 only under 4xx, evaluation stats equal to the last line of
  `data/evaluation-runs.jsonl` (eligibility 0.68, citation 0, 3.2 avg tool
  calls), and hallucination and consistency correctly "No data".
- **Grafana Cloud, after merge:** both dashboards were imported into the real
  stack and shared as snapshots, and the snapshot JSON was read through
  `/api/snapshots/<key>`. The metric names, `job` selector, and label names
  (`http_target`, `http_status_code`, `app_agent_outcome`, `app_tool_name`,
  `gen_ai_token_type`, `gen_ai_request_model`) all resolved in Mimir unchanged,
  which closed the spec's one open check. Then 8 spaced requests (4 × 200,
  including one that triggered web search, 2 × 422, 2 × 503) were sent with the
  Grafana override running, so the live panels had real Cloud traffic.
- **Two-axis code review:** standards (no violations; renamed "Avg latency" to
  "Eval avg latency" so it can't be mistaken for live latency) and spec (metric
  names, units, thresholds correct; the tool-calls-per-run spec line
  corrected).

## What's next

- **A `/fix` for the latency buckets.** One `View` with explicit boundaries
  (for example up to 60 s) on `http.server.duration` in
  [`backend/app/telemetry.py`](../backend/app/telemetry.py) makes p95 and p99
  meaningful. It changes the histogram's shape, so older and newer data won't
  mix cleanly in percentile panels for a while.
- **Feature 17, the `/ops` view.** A protected page in the Next.js app showing
  the same kind of information (plus ingestion health, which these dashboards
  deliberately left out). It can embed Grafana panels, or read a small metrics
  summary endpoint. The PromQL written here is a ready reference for either.
- **Feature 18, hardening.** Pinning the collector image and OTel packages
  matters for dashboards too: a new collector version could rename a metric,
  and every panel would silently show "No data".
- **Feature 21, polish.** Tune thresholds and add **alerts** (Grafana rules
  that notify you when, say, the 5xx ratio stays above 5% for 10 minutes), and
  take the dashboard screenshots for the README.
