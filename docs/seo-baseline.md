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
- **After (23i):** Lighthouse runs 2026-10-08 17:39 to 17:42 UTC against the
  live site with `main` at `83b008b`, confirmed by the live `/` `h1` reading
  "A scholarship and grant eligibility checker that shows its sources." Same
  Lighthouse 13.5.0 CLI, mobile preset and simulated throttling, three runs per
  page and the same median rule. The browser was HeadlessChrome 154, one
  version newer than 23a's 153, on a Windows 11 laptop (AMD Ryzen 5 4600H,
  15 GB RAM), the machine 23f used. 23a did not record its machine, so local
  TBT compares only loosely. The keyless PageSpeed Insights API again returned
  HTTP 429, so the PageSpeed Insights and field data cells come from the web
  UI, as in 23a.

## Lab metrics (mobile)

| Page | Metric | Before | After |
|---|---|---|---|
| `/` | Performance | 78 (runs: 74, 78, 81) | 89 (runs: 86, 89, 93) |
| `/` | SEO | 100 | 100 |
| `/` | FCP | 1.1 s | 1.1 s |
| `/` | LCP | 3.8 s | 3.2 s |
| `/` | CLS | 0 | 0 |
| `/` | TBT | 450 ms | 140 ms |
| `/` | LCP element | Header logo wordmark, `<span class="font-display text-title-sm">ScholarLens</span>` (runs: `h1`, logo, logo) | Header logo wordmark, `<span class="font-display text-title-sm leading-none">ScholarLens</span>` (same in all runs) |
| `/check` | Performance | 84 (runs: 82, 84, 87) | 91 (runs: 91, 91, 90) |
| `/check` | SEO | 100 | 100 |
| `/check` | FCP | 1.1 s | 1.1 s |
| `/check` | LCP | 3.8 s | 3.1 s |
| `/check` | CLS | 0 | 0 |
| `/check` | TBT | 270 ms | 90 ms |
| `/check` | LCP element | Intro paragraph, `<p class="max-w-150 text-lg ...">Describe your situation and we'll tell you where you stand...` (same in all runs) | Intro paragraph, `<p class="max-w-150 text-lg ...">Describe your situation and we'll tell you where you stand...` (same in all runs) |
| `/methodology` | Performance | 88 (runs: 86, 88, 88) | 90 (runs: 90, 90, 90) |
| `/methodology` | SEO | 100 | 100 |
| `/methodology` | FCP | 1.1 s | 1.0 s |
| `/methodology` | LCP | 3.7 s | 3.2 s |
| `/methodology` | CLS | 0 | 0 |
| `/methodology` | TBT | 150 ms | 140 ms |
| `/methodology` | LCP element | The `h1`, "How ScholarLens reaches an answer." (runs: logo, `h1`, logo) | Header logo wordmark, `<span class="font-display text-title-sm leading-none">ScholarLens</span>` (same in all runs) |

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
| `/` | No Data | No Data |
| `/check` | No Data (no origin data) | No Data (no origin data) |
| `/methodology` | No Data (no origin data) | No Data (no origin data) |
| Origin | No Data | No Data |

## PageSpeed Insights cross-check (`/`)

One run in the PageSpeed Insights web UI on 2026-10-07 (Lighthouse 13.5.0,
emulated Moto G Power, slow 4G). It runs on Google's servers, so it is the
easiest comparison for 23i to repeat without an API key. Its TBT is far lower
than the local runs, which shows how much local TBT depends on the machine.

| Form factor | Metric | Before | After |
|---|---|---|---|
| Mobile | Performance | 88 | 91 |
| Mobile | Accessibility / Best Practices / SEO | 100 / 100 / 100 | 100 / 100 / 100 |
| Mobile | FCP | 1.4 s | 1.4 s |
| Mobile | LCP | 3.8 s | 3.2 s |
| Mobile | TBT | 10 ms | 40 ms |
| Mobile | CLS | 0 | 0 |
| Mobile | Speed Index | 3.4 s | 4.5 s |
| Desktop | Performance | 100 | 99 |
| Desktop | LCP | 0.7 s | 0.7 s |

PageSpeed Insights also flagged unused JavaScript (about 69 KiB), legacy
JavaScript (about 14 KiB) and render-blocking requests on both form factors.

The After run was taken in the PageSpeed Insights web UI at 2026-10-08 20:22
UTC (Lighthouse 13.5.0, emulated Moto G Power, HeadlessChromium 153), against
the same deployment as the lab runs, so its method matches Before. Field data
showed "No Data" again. On both form factors it still flagged unused
JavaScript (about 69 KiB), legacy JavaScript (about 14 KiB), render-blocking
requests and a network dependency chain, the items 23f left for a later
decision. Mobile TBT rose from 10 ms to 40 ms and Speed Index from 3.4 s to
4.5 s while LCP fell from 3.8 s to 3.2 s. Before and After are one run each,
so these two rises may be run-to-run variation; they were not investigated.

## On-page inventory (served HTML, before JavaScript)

| Page | Field | Before | After |
|---|---|---|---|
| `/` | HTTP status | 200 | 200 |
| `/` | Title | ScholarLens | Scholarship and grant eligibility checker \| ScholarLens |
| `/` | Description | Find scholarships you actually qualify for, with the exact rule behind every match. | Describe your situation and see which scholarships and grants you qualify for, from the Pell Grant to state aid, with the exact program rule quoted. |
| `/` | Canonical | none | `https://scholar-lens-kappa.vercel.app` |
| `/` | Robots meta | none | none (indexable by default) |
| `/` | Open Graph / Twitter | none | Open Graph (title, description, url, site name, locale, type, 1200x630 PNG image with alt) and Twitter `summary_large_image` (title, description, image with alt); JSON-LD `WebSite` and `Person` |
| `/` | Headings | `h1` See which scholarships you qualify for, and why. `h2` x5 (problem, why ScholarLens, how it works, FAQ, closing call to action), `h3` x14 (problem points, feature cards, steps, FAQ questions) | `h1` A scholarship and grant eligibility checker that shows its sources. `h2` x7 (program coverage summary, problem, why ScholarLens, how it works, who built it, FAQ, closing call to action), `h3` x14 (problem points, feature cards, steps, FAQ questions) |
| `/check` | HTTP status | 200 | 200 |
| `/check` | Title | ScholarLens (inherited from the root layout) | Check your scholarship and grant eligibility \| ScholarLens |
| `/check` | Description | Same as `/` (inherited from the root layout) | Tell us your state, income, GPA and year in school, and we will check your situation against federal and state aid rules and show the rule behind each result. |
| `/check` | Canonical | none | `https://scholar-lens-kappa.vercel.app/check` |
| `/check` | Robots meta | none | none (indexable by default) |
| `/check` | Open Graph / Twitter | none | Open Graph (title, description, url, site name, locale, type, 1200x630 PNG image with alt) and Twitter `summary_large_image` (title, description, image with alt), page-specific image; JSON-LD `WebApplication` (with `Offer` and `Person`) and `BreadcrumbList` |
| `/check` | Headings | `h1` "Check your eligibility", `h2` "What helps the check", "Programs in the knowledge base" | `h1` "Check your eligibility", `h2` "What helps the check", "Programs in the knowledge base" |
| `/methodology` | HTTP status | 200 | 200 |
| `/methodology` | Title | Methodology · ScholarLens | How the scholarship eligibility checker works \| ScholarLens |
| `/methodology` | Description | How ScholarLens reads program rules, decides where to look, and cites every answer. | How ScholarLens reads official program rules, when it searches the web, and why it never calls you eligible without quoting the rule it relied on. |
| `/methodology` | Canonical | none | `https://scholar-lens-kappa.vercel.app/methodology` |
| `/methodology` | Robots meta | none | none (indexable by default) |
| `/methodology` | Open Graph / Twitter | none | Open Graph (title, description, url, site name, locale, type, 1200x630 PNG image with alt) and Twitter `summary_large_image` (title, description, image with alt), page-specific image; JSON-LD `BreadcrumbList` |
| `/methodology` | Headings | `h1` How ScholarLens reaches an answer. `h2` x6 (one per section plus the closing call to action) | `h1` How ScholarLens reaches an answer. `h2` x6 (one per section plus the closing call to action) |
| Unknown URL | HTTP status | 404 | 404, with `noindex` robots meta and no canonical |

Pages added since the baseline: `/programs` and ten program pages (for example
`/programs/federal-pell-grant`) shipped after 23a, so they have no "Before" to
compare against. On 2026-10-08 both returned 200 with their own title,
description, self-referencing canonical, Open Graph and Twitter tags, and a
`BreadcrumbList`, and no robots meta. The sitemap lists all 14 URLs and
`robots.txt` disallows only `/ops`.

## Index status

| Check | Before | After |
|---|---|---|
| Google `site:scholar-lens-kappa.vercel.app` (2026-10-07) | 0 results, no URLs indexed | Not provided: 23i was completed on 2026-10-09, before the planned check on or after 2026-10-11 |

On 2026-10-09 Search Console's URL Inspection reported `/` as "URL is on
Google" with "Page is indexed", so Google indexed the homepage between 23a and
then. The same day the sitemap still showed "Couldn't fetch" with an empty
Last read, and Request indexing for `/check`, `/methodology` and `/programs`
hit Search Console's daily quota. Bing Webmaster Tools processed the sitemap
on 2026-10-08 and discovered all 14 URLs. The Pages and Breadcrumbs reports
and the `site:` count were not checked; that follow-up is not tracked by any
feature.

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
  more than any ranking tweak. (By 2026-10-09 Google had indexed `/`; see
  Index status.)
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
re-run after deploy is in the "After" columns at the top of this document
(23i, 2026-10-08).
