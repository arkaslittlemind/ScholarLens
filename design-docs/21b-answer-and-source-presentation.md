# 21b - Answer and source presentation

## What

This feature redesigned the result card that `/check` shows after a check
finishes. Before, the parts of the answer were stacked in about the same small
type, with little to tell them apart. Now the card reads top to bottom as an
answer:

1. a heading naming the program
2. a color-coded verdict badge
3. the plain-language explanation
4. the exact rule, labelled and attributed to its document
5. a Source section with a link that says where it goes
6. what information is missing
7. the steps the agent actually took
8. a one-line note on what ScholarLens does and doesn't claim

When the agent couldn't quote a rule or cite a source, the card now says so in
plain words instead of leaving a silent gap. The change is entirely in the
frontend. The API and the agent are unchanged. It shipped as PR #43
(`daa8955`).

## Why

ScholarLens's whole claim is that an answer is *auditable*: you can see which
rule decided it and go read that rule yourself. The previous card technically
contained all of that, but it presented it in a way that undercut the claim:

- **The verdict wasn't really color-coded,** though the project plan asks for
  "a clear, color-coded verdict". Only "Eligible" differed, by a thin green
  border. "Partial match" and "Not eligible" looked identical apart from a
  small icon.
- **Nothing said what the answer was about.** The program name sat in a small
  grey line at the bottom.
- **The source was a run-on line,** `Source: program - document (view
  source)`. Its link text, "view source", means nothing when a screen reader
  lists the page's links out of context. It also opened a new tab without
  warning and gave no hint where it led.
- **Missing pieces disappeared.** The backend deliberately allows
  `supporting_clause: null` when a verdict rests on missing information rather
  than a rule. The old card simply didn't render the quote, so a student
  couldn't tell "there is no rule" from "the page forgot to show it". That's
  exactly the kind of ambiguity an auditable tool must not have.
- **The agent's real steps were thrown away.** The backend returns a
  `tool_trace` saying, for example, whether the agent had to search the web.
  The card never showed it, so "did this come from the curated corpus or from
  the open web?" went unanswered.

The cost of leaving this alone: a correct, well-cited answer that *reads* as
vague is, from the student's side, indistinguishable from a vague one. Trust is
a presentation problem as much as an accuracy problem.

## Key concepts

### Information hierarchy

**Information hierarchy** is the order and visual weight in which a page
presents its content, so the most important thing is noticed first. You build
it with size, weight, position, color, and grouping. A newspaper front page is
the classic example: headline, then subhead, then lede, then detail. The plan
gives the order for this card directly: verdict, explanation, rule, source,
uncertainty. The redesign mostly makes that order *visible*, with a heading,
section labels and spacing, instead of leaving it implicit in source order.

### Color-coding, and why color can't work alone

**Color-coding** maps a meaning to a color, so it registers at a glance, like
traffic lights. It has two traps:

1. **Not everyone sees the colors.** About 1 in 12 men has some form of color
   blindness, and screen-reader users don't see color at all. WCAG criterion
   1.4.1 ("Use of Color") says color must never be the *only* way information
   is conveyed. So each badge keeps its icon (check, dot, x) and its text label.
   The color is a third, redundant cue.
2. **Text on a colored fill needs contrast too.** Ink on each fill:

   | Badge | Fill | Ink text contrast |
   |---|---|---|
   | Eligible | mint `#6ece9d` | 10.98:1 |
   | Partial match | sunshine `#ffda6e` | 15.51:1 |
   | Not eligible | cream `#f8f5ed` + ink border | 19.28:1 |

   All three are far above WCAG's 4.5:1 for normal text.

The palette constraint came from feature 10: **no new colors**. The design
system has exactly one green, one yellow, cream, ink and graphite. So the
mapping uses what exists: green for yes, the yellow highlighter for "partly",
and a plain outlined pill for no. Using red would have needed a new token, and
for a cautious eligibility tool, a neutral "no" is also less alarming than a red
one.

### Semantic HTML: `figure`, `blockquote`, `figcaption`, `section`

**Semantic HTML** means choosing elements for what content *is*, not how it
should look, so browsers, search engines and assistive technology can
understand it:

- **`<blockquote>`** marks text quoted from another source.
- **`<figure>`** groups a self-contained piece of content (an image, a code
  sample, or here a quote) with an optional **`<figcaption>`** that describes
  or attributes it. "Quote plus where it came from" is exactly a figure with a
  caption.
- **`<section>`** is a thematic group with its own heading. When it's labelled
  (through `aria-labelledby` pointing at its heading), it becomes a **region
  landmark** that screen-reader users can jump to, like the `<main>` landmark
  from 21a.

`aria-labelledby="some-id"` tells assistive technology "this element's name is
the text of the element with that id". It reuses visible text as the name
instead of duplicating it in an `aria-label` string.

### Accessible link text and new tabs

A link's **accessible name** is normally its text. Screen readers can list all
links on a page out of context, so "view source", "click here" and "read more"
become a column of identical, meaningless entries. Good link text says where
the link goes on its own: "Open source on studentaid.gov".

Opening a **new tab** (`target="_blank"`) without warning disorients people.
Screen-reader and keyboard users in particular may not realize they've changed
context, and the Back button stops working the way they expect. The common fix
is visually hidden text, " (opens in a new tab)". Tailwind's `sr-only` keeps it
in the accessibility tree but off the screen. The link also keeps
`rel="noopener noreferrer"`, which stops the opened page from getting a handle
back to ours (`window.opener`) and from seeing our URL as the referrer.

### Parsing URLs safely

A **URL** has parts: scheme (`https:`), host (`studentaid.gov`), path,
query, and so on. The browser's `URL` class parses a string into those parts
using the same algorithm the browser uses to follow a link. The source URL is
**untrusted**: it comes from model output that may have copied it from a web
page (finding F-13). So the existing guard parses it first and only treats it
as a link if the scheme is `http:` or `https:`. A `javascript:` URL, for
example, would run code when clicked. 21b reuses that same parse to read
`hostname` for the link text. The host shown is therefore the host the browser
will really navigate to, never something guessed from the raw string.

### Showing provenance

**Provenance** is where something came from and how it was produced. Showing
it is a classic trust signal: think of a "sources" list under a news article,
or the ingredients label on food. The agent's `tool_trace` is provenance for
the answer. For example, "Checking official sources" appears only when the
agent searched the web because the curated corpus wasn't enough. Feature 11
showed these steps *while waiting*. 21b keeps the real, final list visible next
to the answer.

### The server/client component boundary (a bug caught in review)

In the Next.js App Router, a file with `'use client'` at the top is a **client
module**: its code is shipped to the browser. A file without it is a **server
component** by default, and it renders on the server.

The two can import each other only in specific ways. When a *server* component
imports something from a client module, it doesn't get the real function.
It gets a **client reference**, a placeholder telling the bundler to load that
code in the browser. Rendering a client *component* through that reference
works. Calling a plain *function* through it (`displayLabel(step)`) fails at
runtime, because on the server it isn't a function at all.

`VerdictCard` has no directive, so it reads as a server component. Today it
only ever runs inside the client `EligibilityChecker`, so importing
`displayLabel` from `AgentActivitySteps.tsx` (a client module) happened to
work. But it was a trap for whoever renders `VerdictCard` from a server page
later. The fix was to move the helper into a neutral module both sides can
import.

## Architecture

```text
EligibilityChecker ('use client', owns the request)
  └─ VerdictCard (no directive; pure presentation of one EligibilityResult)
       ├─ header        h2 = source.program | "Your result"
       │                badge from STATUS_META[status]  (fill + icon + label)
       ├─ explanation   <p>
       ├─ VerdictRule   clause ? <figure> h3 "The rule" + <blockquote> + <figcaption>
       │                       : "No rule was quoted..."
       ├─ VerdictSource source ? <section aria-labelledby> h3 "Source"
       │                         program / document / link-or-inert-text
       │                       : "No source document was cited..."
       ├─ missing info  callout (unchanged)
       ├─ VerdictTrace  steps.length ? h3 + <ol aria-labelledby> : nothing
       └─ scope note    "...not your chances of an award..."

lib/eligibility.ts
  types (EligibilityResult, Source, ...) + displayLabel()  <- shared, no directive
       ▲                                   ▲
AgentActivitySteps ('use client')      VerdictCard
```

How the result's fields map onto the card:

| `EligibilityResult` field | Present | Absent / empty |
|---|---|---|
| `status` | badge (always present) | n/a |
| `source` | h2 = program; Source section | h2 "Your result"; "No source document was cited" |
| `supporting_clause` | "The rule" figure | "No rule was quoted. This result rests on missing information." |
| `source.url` http(s) | "Open source on <host>" link | inert text (non-http) |
| `missing_info` | callout list | nothing |
| `tool_trace` | "How this answer was found" list | nothing |

## What we actually built

All product changes are in
[`../frontend/src/components/check/VerdictCard.tsx`](../frontend/src/components/check/VerdictCard.tsx).

### The badge: one map, three looks

`STATUS_META` was already the single place that knows each status's label and
icon. 21b only changed the `badgeClassName` values:

```ts
// Fills come from the existing palette only (feature 10's no-new-colors rule).
// The icon and label always carry the meaning too, so color is never the only cue.
eligible:     { label: "Eligible",      icon: CheckCircle2, badgeClassName: "border-mint-signal bg-mint-signal text-ink" },
partial:      { label: "Partial match", icon: CircleDot,    badgeClassName: "border-sunshine-highlight bg-sunshine-highlight text-ink" },
not_eligible: { label: "Not eligible",  icon: XCircle,      badgeClassName: "border-ink bg-cream-paper text-ink" },
```

The labels are byte-identical to before. That mattered, because 21a's
screen-reader announcement ("Result ready: Eligible.") reads them through
`statusLabel()`. Changing a label would have silently changed what blind users
hear.

### Small components, one job each

The first version put everything inline, and `VerdictCard` grew to about 95
lines. The standards review cited the project rules ("one job per component",
"functions under 50 lines"), so it was split into three components. Each owns
one field and its empty state:

```tsx
function VerdictRule({ clause, source }: VerdictRuleProps) {
  if (!clause) {
    return <p className="text-sm text-graphite">No rule was quoted. This result rests on missing information.</p>;
  }
  return (
    <figure aria-labelledby="verdict-rule" className="flex flex-col gap-2">
      <SectionHeading id="verdict-rule">The rule</SectionHeading>
      <blockquote className="border-l-2 border-ink pl-4 text-base text-ink wrap-anywhere">
        &ldquo;{clause}&rdquo;
      </blockquote>
      {source && <figcaption className="pl-4 text-sm text-graphite wrap-anywhere">{source.document}</figcaption>}
    </figure>
  );
}
```

The quote also changed from italic grey in a box to upright ink with a left
rule. Italic grey at 16px was the hardest text on the card to read, and it was
the most important text.

### The source link

```tsx
const httpUrl = safeHttpUrl(source.url);
...
{httpUrl ? (
  // The raw string, not httpUrl.href: the check above already proved it is
  // http(s), and href normalization would change what the backend sent.
  <a href={source.url} target="_blank" rel="noopener noreferrer" ...>
    Open source on {httpUrl.hostname}
    <span className="sr-only"> (opens in a new tab)</span>
  </a>
) : (
  <p className="text-graphite">{source.url}</p>
)}
```

`safeHttpUrl` used to return the original string. Now it returns the parsed
`URL`, so the card can read `hostname`. The protocol check itself is
unchanged.

**A decision made in the build.** The spec suggested using the parsed URL for
both `href` and `hostname`. But `URL.href` *normalizes*: for example,
`https://studentaid.gov` becomes `https://studentaid.gov/`. The link would then
point somewhere subtly different from what the backend returned. The spec
reviewer confirmed the raw string is still safe: the browser parses `href`
with the same algorithm the check just ran, so a string that passed as http(s)
can't turn into `javascript:` on click. That reasoning is recorded in the
comment and in the archived spec.

### The trace, and why it isn't announced

```tsx
{/* A plain list on purpose: the in-flight steps already announced as a
    status region, and a second one would repeat them. */}
<ol aria-labelledby="verdict-trace" ...>
```

While the request runs, `AgentActivitySteps` is a `role="status"` live region,
so each step is announced (feature 11). Making the final list a live region as
well would read the whole sequence out a second time. The existing journey
test also asserts that no status region remains once the result is shown, and
that assertion now guards this choice too.

### Fixing the boundary: `displayLabel` moves to `lib`

Steps arrive lowercase (`"checking official sources"`) and are shown
sentence-cased. Both the in-flight list and the final list need that, so the
helper moved into
[`../frontend/src/lib/eligibility.ts`](../frontend/src/lib/eligibility.ts),
next to the types it serves:

```ts
// Trace labels arrive lowercase (backend/app/agent/agent.py); shown sentence-cased.
// Lives here, not in a 'use client' component, so server and client code can share it.
export function displayLabel(step: string): string {
  return step.charAt(0).toUpperCase() + step.slice(1);
}
```

[`../frontend/src/components/check/AgentActivitySteps.tsx`](../frontend/src/components/check/AgentActivitySteps.tsx)
now imports it from there. The spec had originally said to export it from
`AgentActivitySteps`. The standards review caught that this would tie a server
component to a client module (see Key concepts), so it moved. The same file
also lost a stale comment saying `tool_trace` was "not rendered by this
feature".

### Tests and evidence

[`../frontend/e2e/verdict.spec.ts`](../frontend/e2e/verdict.spec.ts) is new,
written before the implementation:

1. **Partial, no rule, no source:**
   - the "Your result" heading, the "Partial match" badge, and both
     explicit "No ..." lines
   - the missing-info callout and the scope note
   - no trace section for an empty `tool_trace`
2. **A cited eligible result:**
   - the program h2, and "The rule" figure with its document caption
   - the link named `Open source on studentaid.gov (opens in a new tab)` and
     its `href`
   - all four trace steps in order, including "Checking official sources"
   - no leftover `role="status"`
3. **An `ftp://` source:** shows the URL as text, and no "Open source" link
   exists.

Tests 1 and 2 failed first. Test 3 passed from the start, because that guard
already existed. It now protects the behavior against regressions.

[`../frontend/e2e/eligibility.spec.ts`](../frontend/e2e/eligibility.spec.ts),
the main journey test, swapped its old `Source: ...` text check for the new
link name. The spec review then noticed that nothing checked the Source
section's own content anymore, so the test now finds the `region` named
"Source" and asserts that the program, the document and the link are inside
it.

The final gate was `npx tsc --noEmit`, `npm run lint` (0 problems),
`npm run build`, and `npm run test:e2e` at 8/8: 2 journey tests, 3 from 21a,
and 3 new. In the in-app browser, with a stubbed `fetch`:

- each status was screenshotted and its badge's computed background read back
  as `rgb(110, 206, 157)`, `rgb(255, 218, 110)` and `rgb(248, 245, 237)` with
  a black border
- at 375px, a full partial result (rule, source, missing info, four steps) had
  zero horizontal overflow and no leftover status region

## What's next

- **Open design questions this left on the table:**
  - The program and document names now appear twice: the heading and the
    Source section, then the rule caption and the Source section. The spec
    asked for that, but the Source section could shrink to just the link.
  - The yellow "Partial match" badge looks a lot like the yellow submit button
    above it. A cream badge with a yellow border would keep yellow for actions
    only.
- **20b step 4, then 21c and 21d.** With 21a and 21b done, 21c (tuned
  dashboards and alerts) and 21d (the final evaluation rerun against
  production, plus screenshots) both wait on confirming that production
  telemetry reaches Grafana Cloud. 21d's dashboard screenshots will be the
  first public look at this card.
- **F-13 (server-side URL validation) is still open.** This card's guard
  makes the current renderer safe, but the backend still returns whatever URL
  the model produced.
