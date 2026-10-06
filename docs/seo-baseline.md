# SEO baseline

Measurements of the live site taken before any SEO work (feature 23a). The
"After" columns are filled in by 23i, using the same method, so the two can be
compared directly.

- **Audit date:** 2026-10-07 (Lighthouse fetch time 2026-10-06 19:36 UTC)
- **Production URL:** https://scholar-lens-kappa.vercel.app
- **Commit measured:** `336376d` on `main`, confirmed by the live `/` `h1`
  reading "See which scholarships you qualify for, and why."
- **Tool:** Lighthouse 13.5.0 (CLI via `npx`), HeadlessChrome 153, mobile form
  factor, simulated throttling (150 ms RTT, about 1.6 Mbps, 4x CPU slowdown),
  412 px wide screen.
- **Method:** three runs per page; the table shows the run with the median
  Performance score. The PageSpeed Insights API was the intended tool, but its
  keyless daily quota returned HTTP 429 on every call, so Lighthouse ran
  locally instead. Local runs depend on the machine, so 23i should repeat them
  on the same machine and tool version.

## Lab metrics (mobile)

| Page | Metric | Before | After |
|---|---|---|---|
| `/` | Performance | 78 (runs: 74, 78, 81) | |
| `/` | SEO | 100 | |
| `/` | LCP | 3.8 s | |
| `/` | CLS | 0 | |
| `/` | TBT | 450 ms | |
| `/` | LCP element | Header logo wordmark, `<span class="font-display text-title-sm">ScholarLens</span>` | |
| `/check` | Performance | 84 (runs: 82, 84, 87) | |
| `/check` | SEO | 100 | |
| `/check` | LCP | 3.8 s | |
| `/check` | CLS | 0 | |
| `/check` | TBT | 270 ms | |
| `/check` | LCP element | Intro paragraph, `<p class="max-w-150 text-lg ...">Describe your situation and we'll tell you where you stand...` | |
| `/methodology` | Performance | 88 (runs: 86, 88, 88) | |
| `/methodology` | SEO | 100 | |
| `/methodology` | LCP | 3.7 s | |
| `/methodology` | CLS | 0 | |
| `/methodology` | TBT | 150 ms | |
| `/methodology` | LCP element | The `h1`, "How ScholarLens reaches an answer." | |

Every Lighthouse SEO audit passed on all three pages. A 100 here only means
the basics are present (status codes, a title, a description, crawlable
links); it does not check canonicals, Open Graph tags, structured data or a
sitemap, which is what 23b to 23g add.

## Field data (real users, CrUX)

Checked in the PageSpeed Insights web UI on 2026-10-07 for `/`, mobile and
desktop. Google has no Chrome UX Report data for the page or the origin. Page
data is a subset of origin data, so `/check` and `/methodology` have none
either.

| Scope | Before | After |
|---|---|---|
| `/` | No Data | |
| `/check` | No Data (no origin data) | |
| `/methodology` | No Data (no origin data) | |
| Origin | No Data | |

## PageSpeed Insights cross-check (`/`)

One run in the PageSpeed Insights web UI on 2026-10-07 (Lighthouse 13.5.0,
emulated Moto G Power, slow 4G). It runs on Google's servers, so it is the
easiest comparison for 23i to repeat without an API key. Its TBT is far lower
than the local runs, which shows how much local TBT depends on the machine.

| Form factor | Metric | Before | After |
|---|---|---|---|
| Mobile | Performance | 88 | |
| Mobile | Accessibility / Best Practices / SEO | 100 / 100 / 100 | |
| Mobile | FCP | 1.4 s | |
| Mobile | LCP | 3.8 s | |
| Mobile | TBT | 10 ms | |
| Mobile | CLS | 0 | |
| Mobile | Speed Index | 3.4 s | |
| Desktop | Performance | 100 | |
| Desktop | LCP | 0.7 s | |

PageSpeed Insights also flagged unused JavaScript (about 69 KiB), legacy
JavaScript (about 14 KiB) and render-blocking requests on both form factors.

## On-page inventory (served HTML, before JavaScript)

| Page | Field | Before | After |
|---|---|---|---|
| `/` | HTTP status | 200 | |
| `/` | Title | ScholarLens | |
| `/` | Description | Find scholarships you actually qualify for, with the exact rule behind every match. | |
| `/` | Canonical | none | |
| `/` | Robots meta | none | |
| `/` | Open Graph / Twitter | none | |
| `/` | Headings | `h1` See which scholarships you qualify for, and why. `h2` x5 (problem, why ScholarLens, how it works, FAQ, closing call to action), `h3` x14 (problem points, feature cards, steps, FAQ questions) | |
| `/check` | HTTP status | 200 | |
| `/check` | Title | ScholarLens (inherited from the root layout) | |
| `/check` | Description | Same as `/` (inherited from the root layout) | |
| `/check` | Canonical | none | |
| `/check` | Robots meta | none | |
| `/check` | Open Graph / Twitter | none | |
| `/check` | Headings | `h1` Check your eligibility. `h2` What helps the check, Programs in the knowledge base | |
| `/methodology` | HTTP status | 200 | |
| `/methodology` | Title | Methodology · ScholarLens | |
| `/methodology` | Description | How ScholarLens reads program rules, decides where to look, and cites every answer. | |
| `/methodology` | Canonical | none | |
| `/methodology` | Robots meta | none | |
| `/methodology` | Open Graph / Twitter | none | |
| `/methodology` | Headings | `h1` How ScholarLens reaches an answer. `h2` x6 (one per section plus the closing call to action) | |
| Unknown URL | HTTP status | 404 | |

## Index status

| Check | Before | After |
|---|---|---|
| Google `site:scholar-lens-kappa.vercel.app` (2026-10-07) | 0 results, no URLs indexed | |

## Observations for later steps

- LCP sits at 3.7 to 3.8 s on every page while FCP is about 1.1 s. On `/` the
  LCP element is the header logo rather than the hero headline; the headline
  and preview fade in on a delay, which is worth examining in 23f.
- `/` has the highest local TBT (450 ms) of the three pages, but PageSpeed
  Insights measured 10 ms, so treat local TBT as machine-dependent.
- PageSpeed Insights flags about 69 KiB of unused JavaScript and
  render-blocking requests (23f).
- Google has indexed nothing yet, so Search Console submission (23i) matters
  more than any ranking tweak.
- `/check` has no title or description of its own (23b).
- No page declares a canonical URL or any social share tags (23b, 23d).
