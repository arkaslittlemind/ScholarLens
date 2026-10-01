# 09 - SaaS landing page

## What

`/` is ScholarLens's front door: a server-rendered marketing page. It explains
the product in about ten seconds and sends visitors to the eligibility check.
It has:

- a **hero**: headline, one-line pitch, a primary "Check your eligibility"
  button, a secondary "See how it works" button, and a privacy line ("No
  account required. Nothing you enter is stored after your result.")
- a three-step **"How it works"**: describe your situation, the agent checks
  the rules, get a cited answer
- a **trust section** of two feature cards, "Cited, not guessed" and
  "Partial matches count"
- a closing **call-to-action block** and a minimal footer

An honest note on history: almost all of this page was built *before* the
Blueprint workflow started, alongside the design reference (`036dae0`). When
feature 9 came up, the spec compared the existing page with the feature's
contract. It found exactly one gap: the page used the yellow primary button
twice, against the design system's rule. So the merged diff for feature 9
(`7c5d712`, PR #12) is one `className` change. This doc covers the page as it
stands, because that is what feature 9 delivers. That one-line fix happens to
teach a real design idea.

## Why

The landing page is the only page most visitors will ever see. For a
portfolio project it also carries the pitch: what problem this solves and why
anyone should trust the answer. Without it, a visitor hits a bare form with
no idea what it does or why its answers are credible.

The product's whole differentiator is **cited answers**: most eligibility
tools say yes or no; ScholarLens shows the exact rule. A landing page that
does not say that up front throws the differentiator away. So the trust
section is built around it rather than around generic SaaS claims.

## Key concepts

### Landing page anatomy

Most product landing pages follow the same proven order, because it mirrors
the questions a visitor asks:

1. **Hero:** "What is this, and is it for me?" A headline, one line of
   support, and the main action.
2. **How it works:** "What would I actually do?" A small number of concrete
   steps (three here).
3. **Trust or differentiators:** "Why believe it / why this one?" Here:
   citations and partial matches.
4. **Closing CTA:** "OK, how do I start?" One more chance to act, for people
   who read to the bottom.

A **CTA** (call to action) is the element asking the visitor to do the one
thing you want, here starting a check.

### Server rendering and static pages

The landing page is a **server component** with no `'use client'`, no state,
and no effects. Next.js renders it to HTML **at build time**. The build
output marks it `○ (Static)`, meaning "prerendered as static content".
Benefits:

- **Fast:** the HTML is ready before anyone asks, and can be served from a CDN
  (a content delivery network, servers near the visitor).
- **No JavaScript needed** to see the content, which helps slow phones and
  search engines (SEO, search engine optimization).
- **Nothing to break at runtime:** no API call means no loading state and no
  error state.

That is the right default for content that is the same for everyone.

### Visual hierarchy and rationing the primary color

**Visual hierarchy** is how a design tells the eye what matters most. The
strongest tool is contrast: one thing looks different from everything else.

`design.md` defines two button styles:

- **Sunshine Filled Button:** yellow fill, the *primary* action. Its rule is
  "Single instance per view - yellow is rationed."
- **Ghost Ink Button:** transparent with a black border, the *secondary*
  action.

The reasoning: if two buttons are both bright yellow, neither is "the" action
and the eye has to choose. Rationing keeps the yellow meaningful: on any
screen it means "this is the next step".

The page had two yellow buttons, one in the hero and one in the closing CTA
block. Feature 9 kept the hero's, because it's the first CTA a visitor meets,
and turned the closing one into a Ghost Ink button. The page still ends on a
clear action, without competing with itself.

### A design system as rules, not just colors

A **design system** is more than a palette. It includes *usage rules*: when a
component may appear, how many times, and in what role. Feature 8 encoded
the *values* (tokens). Feature 9 enforced a *rule*. Rules are easy to break
gradually, since each extra yellow button looks harmless on its own, so
checking against them is a real part of design work.

### Anchor links

"See how it works" uses `href="#how-it-works"`. A `#fragment` link scrolls to
the element with that `id` on the same page, with no navigation or page
load. It suits a secondary action that means "tell me more first".

## Architecture

```text
/  (app/page.tsx, server component, prerendered static HTML)
├── SiteHeader                  wordmark + "Check eligibility" (ghost pill)  -> /check
├── Hero section
│   ├── h1 headline + pitch
│   ├── [Check your eligibility]   SUNSHINE (the one primary)            -> /check
│   ├── [See how it works]         ghost ink                             -> #how-it-works
│   └── privacy trust line
├── #how-it-works               3 cards with StepCircle 1-2-3
├── Trust section               FeatureCard x2: "Cited, not guessed", "Partial matches count"
├── Closing CTA block           [Check your eligibility]  ghost ink (was sunshine)   -> /check
└── Footer
```

Every path leads to `/check`. Small helper components (`StepCircle`,
`FeatureCard`) live in the same file because nothing else uses them yet,
following the "don't abstract before there's a second user" rule.

## What we actually built

The page is [`frontend/src/app/page.tsx`](../frontend/src/app/page.tsx). The
feature 9 change:

```diff
           <a
             href="/check"
-            className="mt-4 rounded-full bg-sunshine-highlight px-6 py-4 text-base font-medium text-ink"
+            className="mt-4 rounded-full border border-ink px-6 py-4 text-base font-medium text-ink"
           >
             Check your eligibility
           </a>
```

The replacement classes are copied exactly from the existing "See how it
works" button, the ghost ink pattern already on the page, rather than
invented.

**What the spec verified was already there,** with no change needed:

- the server-rendered hero
- the how-it-works section
- the trust section built on the cited-clause differentiator
- a CTA into `/check`

It also deliberately avoided re-opening hero copy, cards, or layout.

**Check:** `npm run lint` passed, exactly one element on `/` uses
`bg-sunshine-highlight`, and `npm run dev` showed the closing button as an ink
outline.

**A small promise worth knowing about:** the privacy line says nothing you
enter is stored after your result. That is true by design: v1 has no
accounts and no persisted profiles. Later features kept it true:

- Feature 13's logging never logs prompts or profiles.
- Feature 18b scrubs student data from telemetry.

A sentence on a landing page can be a requirement.

## What's next

- **10 - `/check`:** the destination of every CTA on this page becomes real.
- **21 - production polish:** a final UX and accessibility pass and verified
  mobile responsiveness. The page already uses responsive classes
  (`sm:text-[64px]`, `sm:grid-cols-3`), but nobody has formally checked it on
  phones yet.
