# Changelog

All notable changes to ScholarLens are recorded in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- The backend now runs on Google Cloud Run. It scales to zero when idle, so the
  first check after a quiet spell can take a few extra seconds while it starts.
- The knowledge base index is built into the backend image at deploy time
  instead of living on a separate volume, so the rules a check reads always
  match the code that is serving.
- The site's address is now <https://scholarlens.arkaslittlemind.com>. Links to
  the old `scholar-lens-kappa.vercel.app` address redirect permanently to the
  same page on the new one.
- Merging a backend change to `main` now deploys it automatically through a
  Cloud Build trigger; changes outside `backend/` do not start a deploy.
- Production telemetry is not connected to Grafana Cloud on Cloud Run yet, so
  the production dashboards, alerts, and the `/ops` traffic trends show no new
  data until it is set up again.

### Removed

- The Railway hosting configuration. Railway no longer runs any part of
  ScholarLens.

## [1.0.0] - 2026-10-27

The first public release.

### Added

- An eligibility check at `/check`: describe your situation in plain words and
  get a verdict of eligible, partial match, or not eligible for each program,
  with the program rule quoted word for word and a link to its official source.
- Reasons that tie each fact about you to the rule it meets or misses, a list
  of details that would change the answer, and next steps for each result.
- Optional fields for country, state or region, household income in ten
  currencies, grades on common scales, and field of study, plus three worked
  examples to start from.
- Reviewed rules for ten US programs: the Federal Pell Grant, Federal SEOG,
  Federal TEACH Grant, Cal Grant A and B, Florida Bright Futures, Georgia HOPE,
  New Jersey EOF, NJ STARS, New Jersey TAG, and New York TAP.
- Answers for students outside the US and for programs the reviewed rules don't
  cover, found by searching the web with official sources preferred, and each
  result says whether it came from the reviewed rules or from the web.
- Suggestions for other programs to look at, shown only when a search during
  the same check returned a page for them, so none are made up.
- A page for each covered program under `/programs`, with its rules in plain
  language and a link to the official guidelines.
- A methodology section that explains how the agent decides where to look,
  shows a real cited result, says plainly that the reviewed rules cover only
  the US, and gives reviewers a page on how the system is built.
- A landing page that shows what a cited answer looks like before you try one.
- The answer's summary appears word by word once it is ready, and every
  animation respects the reduced-motion setting.
- Accessibility work across the site: a failed submit moves focus to the first
  field that needs fixing, every page stays usable at large text sizes, and the
  official-rules link on each program page has a full-size touch target.
- A password-protected `/ops` page for the maintainer with evaluation results
  and their run history, the knowledge base ingestion status, and traffic
  trends from Grafana.
- An evaluation pipeline that scores eligibility accuracy, citation accuracy,
  hallucination rate, and consistency over labeled student profiles.
- Production telemetry: OpenTelemetry traces, Prometheus metrics, and
  structured logs with per-request correlation IDs, Grafana dashboards for
  service health and AI quality, and alert rules.
- Per-visitor rate limits, timeouts on every external call, and clear error
  responses when the service is busy or a provider is unavailable.
- Page titles, descriptions, share images, a sitemap, robots rules, and
  structured data, so search engines and social previews describe each page
  correctly.

### Security

- No accounts, and nothing a student enters is stored: descriptions, prompts,
  and tool payloads are kept out of logs and telemetry, and API keys stay on
  the server.
- Only `http` and `https` source links are rendered as links.

[Unreleased]: https://github.com/arkaslittlemind/ScholarLens/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/arkaslittlemind/ScholarLens/releases/tag/v1.0.0
