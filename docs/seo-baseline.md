# SEO baseline

Measurements of the live site taken before any SEO work (feature 23a). The
"After" columns are filled in by 23i, using the same method, so the two can be
compared directly.

- **Audit date:** 2026-10-07 (Lighthouse runs 2026-10-06 19:35 to 19:38 UTC)
- **Production URL:** https://scholar-lens-kappa.vercel.app
- **Commit measured:** `336376d` on `main`, confirmed by the live `/` `h1`
  reading "See which scholarships you qualify for, and why."
- **Tool:** Lighthouse 13.5.0 (CLI via `npx`), HeadlessChrome 153, mobile form
  factor, simulated throttling (150 ms RTT, about 1.6 Mbps, 4x CPU slowdown),
  412 px wide screen.
- **Method:** three runs per page; the table shows the run with the median
  Performance score, and on a tie the earlier run. The PageSpeed Insights API was the intended tool, but its
  keyless daily quota returned HTTP 429 on every call, so Lighthouse ran
  locally instead. Local runs depend on the machine, so 23i should repeat them
  on the same machine and tool version.

## Lab metrics (mobile)

| Page | Metric | Before | After |
|---|---|---|---|
| `/` | Performance | 78 (runs: 74, 78, 81) | |
| `/` | SEO | 100 | |
| `/` | FCP | 1.1 s | |
| `/` | LCP | 3.8 s | |
| `/` | CLS | 0 | |
| `/` | TBT | 450 ms | |
| `/` | LCP element | Header logo wordmark, `<span class="font-display text-title-sm">ScholarLens</span>` (runs: `h1`, logo, logo) | |
| `/check` | Performance | 84 (runs: 82, 84, 87) | |
| `/check` | SEO | 100 | |
| `/check` | FCP | 1.1 s | |
| `/check` | LCP | 3.8 s | |
| `/check` | CLS | 0 | |
| `/check` | TBT | 270 ms | |
| `/check` | LCP element | Intro paragraph, `<p class="max-w-150 text-lg ...">Describe your situation and we'll tell you where you stand...` (same in all runs) | |
| `/methodology` | Performance | 88 (runs: 86, 88, 88) | |
| `/methodology` | SEO | 100 | |
| `/methodology` | FCP | 1.1 s | |
| `/methodology` | LCP | 3.7 s | |
| `/methodology` | CLS | 0 | |
| `/methodology` | TBT | 150 ms | |
| `/methodology` | LCP element | The `h1`, "How ScholarLens reaches an answer." (runs: logo, `h1`, logo) | |

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
| `/check` | Headings | `h1` "Check your eligibility", `h2` "What helps the check", "Programs in the knowledge base" | |
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

- LCP sits at 3.7 to 3.8 s on every page while FCP is about 1.1 s. The LCP
  element flips between the header logo and the `h1` across runs on `/` and
  `/methodology`; the hero headline and preview fade in on a delay, which is
  worth examining in 23f.
- `/` has the highest local TBT (450 ms) of the three pages, but PageSpeed
  Insights measured 10 ms, so treat local TBT as machine-dependent.
- The JavaScript and render-blocking issues in the PageSpeed Insights
  cross-check above belong to 23f.
- Google has indexed nothing yet, so Search Console submission (23i) matters
  more than any ranking tweak.
- `/check` has no title or description of its own (23b).
- No page declares a canonical URL or any social share tags (23b, 23d).

## 23f performance pass

Before and after the Core Web Vitals work (feature 23f), measured on a local
production build so the only difference between the columns is the code. These
are not the production numbers above, and they do not fill the "After"
columns, which 23i fills from the live site.

- **Date:** 2026-10-07
- **Build:** `npm run build` then `npm run start`, measured at
  `http://localhost:3000`
- **Machine:** Windows 11 laptop, AMD Ryzen 5 4600H, 15 GB RAM
- **Tool:** Lighthouse 13.5.0 (CLI via `npx`), HeadlessChrome 154, mobile form
  factor, simulated throttling, the same settings as 23a
- **Method:** three runs per page, both columns on the same machine in the same
  session; the table shows the run with the median Performance score

### Lab metrics (mobile, local build)

| Page | Metric | Before | After |
|---|---|---|---|
| `/` | Performance | 84 (runs: 85, 84, 84) | 91 (runs: 91, 91, 91) |
| `/` | FCP | 0.9 s | 0.9 s |
| `/` | LCP | 4.4 s | 3.3 s |
| `/` | CLS | 0 | 0 |
| `/` | TBT | 114 ms | 116 ms |
| `/` | LCP element | Header wordmark | Header wordmark |
| `/check` | Performance | 85 (runs: 85, 85, 85) | 92 (runs: 92, 92, 91) |
| `/check` | FCP | 0.8 s | 0.8 s |
| `/check` | LCP | 4.2 s | 3.3 s |
| `/check` | CLS | 0 | 0 |
| `/check` | TBT | 100 ms | 74 ms |
| `/check` | LCP element | Intro paragraph | Intro paragraph |
| `/methodology` | Performance | 86 (runs: 86, 86, 87) | 92 (runs: 92, 93, 92) |
| `/methodology` | FCP | 0.8 s | 0.8 s |
| `/methodology` | LCP | 4.1 s | 3.3 s |
| `/methodology` | CLS | 0 | 0 |
| `/methodology` | TBT | 94 ms | 105 ms |
| `/methodology` | LCP element | Header wordmark | Header wordmark |
| `/` | Fonts / scripts downloaded | 294 KiB / 238 KiB | 148 KiB / 238 KiB |
| `/check` | Fonts / scripts downloaded | 294 KiB / 238 KiB | 148 KiB / 238 KiB |
| `/methodology` | Fonts / scripts downloaded | 294 KiB / 230 KiB | 148 KiB / 230 KiB |

The LCP breakdown in every median run is time to first byte (6 to 17 ms) plus
element render delay (144 to 369 ms), with no resource load phase because the
LCP element is text. The render delay is the time the browser spends before its
first paint, not the hero fade.

### Font inventory (every page, transfer sizes)

| Face | Before | After |
|---|---|---|
| Fraunces upright, latin | 118 KiB, preloaded | 118 KiB, preloaded |
| Fraunces italic, latin | 146 KiB, preloaded | not downloaded on mobile (fetched only where italic renders, at `xl` widths) |
| Instrument Sans, latin | 29 KiB, preloaded | 29 KiB, preloaded |

The build also emits `latin-ext` and `vietnamese` files for each face. Browsers
fetch those only for characters in their ranges, which no page uses, so they
cost nothing here. Instrument Sans already requested one variable file in one
subset, so it was left unchanged.

### What changed and what it moved

- **Fraunces italic is no longer preloaded.** The italic face was declared
  together with the upright one, so its 149 KB latin file was preloaded on
  every page, though italic only appears in the two hero annotations shown at
  `xl` widths. It is now its own declaration with `preload: false`, and the
  `font-display` utility switches to it for `italic` text. The spec suggested
  putting the variable on `Annotation` itself; it lives in the utility instead
  because a second `font-family` class beside `font-display` would depend on
  CSS order to win. Phones no longer
  download it, and desktop still renders the true italic (checked in a browser
  at 412 px and 1440 px). This cut font bytes in half and LCP by about 0.9 to
  1 s on every page.
- **The `WONK` axis is dropped.** The design pinned it to its default of 0, so
  it was removed from the font request and from `font-variation-settings`. The
  upright file shrank by under 1 KB, so this is tidiness rather than speed.
  `SOFT` and `opsz` stay: the first is set by the design, the second drives
  automatic optical sizing on the headings.
- **The hero entrance did not change.** In all 18 runs, LCP fired at first
  paint (LCP equals FCP) on an element that does not animate: the header
  wordmark, or the `/check` intro paragraph. The `h1` fade never moved LCP
  later, so it stays as designed.
- **Motion stays.** TBT was already under 200 ms on every page (74 to 138 ms
  across all runs). `SiteHeader` and `MobileMenu` use Motion on every page, so
  it ships in a shared chunk of about 81 KiB (gzip), together with Radix
  Dialog, whatever `/` does. `Reveal`, `DrawLine` and `MarkerUnderline` add
  only a few KiB on `/`, so moving them to CSS would not remove Motion and
  was not needed for TBT.
- **Other PageSpeed notes, measured but unchanged:** legacy JavaScript is about
  13 KiB on every page and render-blocking CSS is estimated at 40 to 80 ms
  where reported. Lighthouse also flags 67 to 81 KiB of unused JavaScript per
  page. These are left for a later decision.
- **Images:** the three pages have no raster `<img>`; the hero preview is
  HTML. Any future raster image should go through `next/image` with explicit
  `width` and `height`.

### Remaining gap

CLS (0) and TBT (under 200 ms) meet the targets. LCP improved to 3.3 s but is
still above 2.5 s. With simulated throttling, Lighthouse estimates LCP from
every request that starts before the real first paint. That paint lands at
about 150 to 360 ms unthrottled, after the browser has already requested the
remaining 118 KiB Fraunces file and all of the JavaScript. Getting under 2.5 s
in the lab would mean shipping less JavaScript before first paint (for example
lighter Motion loading in the header and mobile menu, or fewer client
components) or dropping the `opsz` axis, which changes how the headings look.
Both are outside this feature and need their own decision. The production
re-run after deploy is pending for 23i.
