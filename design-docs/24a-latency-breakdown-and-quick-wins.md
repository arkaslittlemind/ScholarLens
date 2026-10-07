# 24a - Latency breakdown and quick wins

## What

This feature taught the evaluation to say *where* an answer's time goes, not
just how long it took. Every evaluation attempt now records how many model
requests the agent made, how long it spent inside retrieval (embedding plus
ChromaDB), how long inside web search (Tavily), and how long the model's first
turn took. The run summary splits mean latency into "answered from the program
documents" and "had to search the web". Three new labeled profiles ask about
programs that are *not* in the corpus, so the slower web-search path finally
gets measured too.

With that breakdown in hand, the feature tried four speed-ups, one at a time,
against a fixed accuracy guardrail. One survived: asking Gemini to think less
(`thinking: "low"`). Local results over 28 profiles x 3 attempts:

| | Before | After |
|---|---|---|
| Corpus answers | 13.6 s | 7.2 s (-47%) |
| Web-search answers | 15.1 s | 12.6 s (-17%) |
| Eligibility accuracy | 85.7% | 90.5% |
| Citation accuracy | 87.9% | 98.5% |
| Engine errors | 7 of 84 | 0 of 84 |

Faster *and* more accurate, which is not the usual trade.

## Why

After launch, a real query (an international PhD student asking about the NSF
GRFP) came back slow. The deployed evaluation from 21d said answers average
7.6 s, which sounded fine, but that number had a blind spot: all 25 profiles
were answerable from the corpus. Nothing measured the web-search path, which is
exactly the path that query took.

Worse, "7.6 s" is a single number. It cannot tell you whether to speed up the
model, the vector store, or the search API. Without a breakdown, every
optimization is a guess, and guesses in an agent are expensive: each experiment
costs real Gemini credits (about Rs 35 to 50 per full run) and can quietly hurt
accuracy. The cost of not having this feature was optimizing blind, or not
optimizing at all while the live checker felt sluggish.

## Key concepts

### Latency, and why the average lies

**Latency** is the wall-clock time from asking to getting an answer. An
**average** (mean) over many attempts is the usual summary, but averaging two
different populations hides both. If corpus answers take 7 s and web answers
take 13 s, and 90% of your test profiles are corpus questions, the average
looks like 7.6 s and tells you nothing about the student who needed a web
search. That is why the evaluation now reports **splits**: `corpus_latency_ms`
and `web_latency_ms`, each the mean over only its own kind of answer.

Think of a restaurant reporting "average wait 10 minutes" when walk-ins wait 5
and large parties wait 45. The large party does not care about the average.

### Where time goes in an agent run

An agent like ScholarLens's is a loop:

1. Send the conversation to the model (a **model request**).
2. The model either answers or asks to call a **tool** (retrieve program
   rules, search the web).
3. If it called a tool, run the tool, append the result, and go back to 1.

So one answer is a chain of model requests with tool calls in between. A
corpus answer is typically two model requests: "I should look up the rules"
then "here is the verdict". A web answer is three: look up rules, decide to
search the web, then answer. Every extra hop adds a full model round trip.

The time therefore splits into:

- **Model time**: the model reading the prompt, thinking, and writing output.
- **Tool time**: retrieval and web search.
- **Overhead**: network and serialization, small here.

### Measuring by instrumenting the edges

You cannot easily put a stopwatch *inside* Gemini. But you can time the parts
you own and subtract. The agent already owns the tools, so it times each tool
call around the client call, and records when the first tool call started.
Then:

- `retrieval_ms`: summed time inside `retrieve_program_rules`.
- `web_search_ms`: summed time inside `search_the_web`.
- `first_turn_ms`: run start to the first tool call, which is the model's
  first turn.
- Model time is whatever is left: total latency minus tool time.

This is a common profiling trick: measure the boundaries you control, derive
the rest. It needs no new dependency and no extra telemetry pipeline.

### Thinking tokens and the thinking level

Modern models like Gemini can "think" before answering: they generate hidden
reasoning tokens, then the visible output. More thinking can help on hard
multi-step problems, but every thinking token takes time to generate (and is
billed). The **thinking level** is a dial: low, medium, high, or the model's
default.

ScholarLens's final turn mostly does a constrained job: read retrieved rule
text, quote the relevant clause, fill a structured verdict. The baseline showed
that final turn took about 9.8 s of a 13.6 s corpus answer. Most of that was
the model reasoning at length about rules it was going to quote verbatim
anyway. Lowering the thinking level cut the final turn to about 4.0 s.

Why did accuracy go *up*? A plausible reading: with heavy thinking, some runs
ran long enough to hit timeouts (the 7 engine errors) and some over-reasoned
past the plain text of the rule. Less thinking meant answers stayed close to
the quoted clause.

### Baseline, target, guardrail

A disciplined performance change has three numbers fixed *before* touching
anything:

- **Baseline**: a measured run of the current system.
- **Target**: what "faster enough" means, written down after the baseline and
  before any change. Here: web path at least 25% faster, corpus path faster at
  all.
- **Guardrail**: what must not get worse. Here: eligibility and citation
  accuracy each within 3 points of baseline, hallucination at or below 3%. A
  change that breaks the guardrail is reverted however much time it saves.

Writing the target first stops you from moving the goalposts to fit whatever
the change happened to achieve. The guardrail is what makes speed work safe in
an AI system, where it is easy to make answers faster by making them worse.

### One change at a time

If you apply three changes and accuracy drops, you cannot tell which one did
it. So candidates were tried individually and kept only when the numbers
supported them. Each full run costs credits, so the spec also set rules for
when a candidate is not even worth trying (see "pre-retrieval" below).

### Additive schema evolution

Evaluation runs are appended to `data/evaluation-runs.jsonl`, one JSON record
per run, and `/ops` reads that file. Old records were written before these new
fields existed. If the new fields were required, every old record would fail to
parse and `/ops` would break. So every new field is **optional with a `None`
default**: old records load with those fields as `None`, and the aggregates
skip `None` values. This is the same rule a public API follows: add fields, do
not require them, never repurpose old ones.

### Labeled out-of-corpus profiles

An **evaluation profile** is a synthetic student plus the expected verdict, a
labeled test case for the agent. The three new `web-` profiles (NSF GRFP for an
international student, Gilman without a Pell Grant, Goldwater with a 2.7 GPA)
each rest on one stable published rule, checked against the official page when
written. They are scored on **status only**: a web-search clause cannot be
checked against the corpus text, so citation and hallucination scoring would be
meaningless for them.

## Architecture

```mermaid
flowchart LR
    P[Profile] --> R[Evaluation runner]
    R -->|check_eligibility_measured| A[EligibilityAgent]
    subgraph A[EligibilityAgent run]
        M1[Model request 1] --> T1[retrieve_program_rules<br/>timed: retrieval_ms]
        T1 --> M2[Model request 2]
        M2 -->|web path only| T2[search_the_web<br/>timed: web_search_ms]
        T2 --> M3[Model request 3]
    end
    A -->|result + RunMeasurement| S[score_attempt]
    S --> AR[AttemptResult<br/>+ timing fields]
    AR --> AG[aggregate]
    AG --> RM[RunMetrics<br/>corpus vs web splits]
    RM --> J[(evaluation-runs.jsonl)]
    J --> O[/ops]
```

The timing travels as a small frozen dataclass, `RunMeasurement`, returned next
to the result. The public `POST /eligibility` path calls the same agent but
throws the measurement away, so the API shape did not change.

## What we actually built

### Timing inside the agent

[`../backend/app/agent/agent.py`](../backend/app/agent/agent.py): the per-run
dependencies object (`_Deps`) gained counters, and each tool records its own
time:

```python
@dataclass
class _Deps:
    ...
    tool_calls: int = 0
    retrieval_seconds: float = 0.0
    web_search_seconds: float = 0.0
    first_tool_at: float | None = None
```

```python
started = ctx.deps.tool_started()
...
try:
    chunks = await ctx.deps.retriever.retrieve(query)
finally:
    ctx.deps.retrieval_seconds += time.perf_counter() - started
```

The `finally` matters: a tool that fails still counts its time, so a slow
failure is not invisible. `tool_started()` also bumps the tool count and
remembers the first tool call, which marks the end of the model's first turn.

`RunMeasurement.of(deps, model_requests)` freezes those into milliseconds.
`model_requests` comes from Pydantic AI's own usage counter
(`run_result.usage.requests`), so no guessing about how many hops happened.

A subtle bit: the agent retries once on a short rate limit (feature 22). Each
attempt gets **fresh deps**, so the measurement describes only the attempt that
actually answered, not a half-finished one that hit a 429.

The one optimization that survived is a single line:

```python
model_settings={"thinking": "low"},
```

### Timing in the evaluation

- [`../backend/app/evaluation/models.py`](../backend/app/evaluation/models.py):
  `AttemptResult` gained `model_requests`, `retrieval_ms`, `web_search_ms`,
  `first_turn_ms`; `RunMetrics` gained the matching means plus
  `corpus_latency_ms` and `web_latency_ms`. All optional, all `None` by default.
- [`../backend/app/evaluation/scoring.py`](../backend/app/evaluation/scoring.py):
  `score_attempt` spreads the measurement into the attempt with
  `**asdict(measurement)`, and `aggregate` computes the splits:

  ```python
  corpus_latency_ms=_mean_or_none([a.latency_ms for a in completed if not a.used_web_search]),
  web_latency_ms=_mean_or_none([a.latency_ms for a in completed if a.used_web_search]),
  # Over web answers only: counting the zeros of corpus answers would hide the search cost.
  web_search_ms=_mean_or_none([a.web_search_ms for a in completed if a.used_web_search]),
  ```

  That last comment came from the code review. The first version averaged
  `web_search_ms` over every answer, so the many corpus answers (with 0 ms of
  web search) diluted it to about 294 ms when the real per-web-answer cost was
  about 2.5 s. The same "averages lie" lesson as the latency split, caught a
  second time.
- [`../backend/app/evaluation/runner.py`](../backend/app/evaluation/runner.py)
  now passes the measurement through, and
  [`../backend/app/evaluation/__main__.py`](../backend/app/evaluation/__main__.py)
  prints the new lines (`without web search`, `with web search`,
  `mean model requests`, and so on).

### The new profiles

[`../backend/data/evaluation/profiles.json`](../backend/data/evaluation/profiles.json)
gained `web-nsf-grfp-international`, `web-gilman-no-pell`, and
`web-goldwater-gpa-too-low`, all `not_eligible` with `expected_program` and
`expected_citation` left null.

### The experiments, and what each one taught

| Candidate | Outcome | Why |
|---|---|---|
| 1. Thinking level low | **Kept** | The final answering turn was about 9.8 s of a 13.6 s answer; it dropped to about 4.0 s. |
| 2. Tavily `search_depth: "basic"`, fewer results | Tried, reverted | Web search went from about 2.5 s to 2.75 s, no gain. Basic is probably Tavily's default already. |
| 3. Smaller `retrieval_top_k` | Skipped | Retrieval time is the query *embedding* call, not the number of chunks returned. Fewer chunks would only risk citation accuracy. |
| 4. Pre-retrieval (fetch rules before the first model call) | Skipped | The rule was "only if the first turn is at least 25% of corpus latency". It was 21%. |

Candidate 3 shows why the breakdown matters: "retrieval is slow, fetch fewer
chunks" sounds reasonable, but the numbers showed that the time is spent
*computing the query vector*, which does not depend on top-k at all.

Candidate 4 shows the value of deciding thresholds up front. Pre-retrieval is
a real technique (skip a whole model round trip by giving the model the rules
up front), but it changes the agent's shape and its tool usage. The 25% bar
said it would not pay for its complexity here, and that was settled before
anyone got attached to it.

### Checks that proved it

- `pytest` and `ruff check .`: new agent tests with a stubbed retriever that
  sleeps (to get a nonzero `retrieval_ms`), a test that the model is asked for
  low thinking, scoring tests for the splits with a mixed web and corpus
  attempt set, and a test that an old-format run record still parses.
- Two paid local evaluation runs: baseline `32b2e00b`, after `751896cd`, both
  28 profiles x 3 on the same machine.
- Local numbers are compared only with each other, never with 21d's production
  7.6 s: local latency includes this machine's network path to Gemini and
  Tavily.

## What's next

The web-path target (12.6 s vs a goal of 11.3 s) was missed. The breakdown says
why: web answers make three model requests and spend about 2.5 s in Tavily, so
the remaining cost is two model turns plus the search. The notes pointed at two
next levers, which became the rest of feature 24:

- **24b** made the output smaller and structured (summary, reasons, next steps,
  cited alternatives), which also helps the final turn.
- **24c** compared real streaming against revealing the finished answer, using
  these measurements, and chose the reveal.

The timing fields stay in every future evaluation run, so any later speed or
model change can be judged against this baseline instead of a guess.
