# ScholarLens: Style Reference
> a printed eligibility report, annotated in rust marker

**Theme:** light only

ScholarLens reads like a well-set printed document: white paper with a warm tint band for rhythm, near-black ink, and a soft book serif for every headline. Color is rationed. Brown carries actions, rust is the annotation marker (underlines, quoted-rule highlights, step numerals), and sage marks a positive status. Elevation is quiet: hairline borders plus one soft shadow. Motion is editorial, not decorative: things settle into place once, then stay still.

Inspired by linkletter.press (light mode).

## Tokens: Colors

All tokens live in `frontend/src/app/globals.css` on `:root` and are exposed to Tailwind via `@theme inline`.

| Token | Value | Role |
|-------|-------|------|
| `--color-paper` | `#ffffff` | Page canvas and card surfaces |
| `--color-tint` | `#f7f5f1` | Alternating section bands, quiet fills, chips |
| `--color-ink` | `#1a1a1a` | Headings and primary text |
| `--color-ink-secondary` | `#534a39` | Body copy, captions, nav links |
| `--color-brown` | `#3b2c20` | Primary buttons, CTA blocks, focus ring |
| `--color-hairline` | `#e6e2da` | Card borders, dividers |
| `--input` | `#d6d1c7` | Form control borders (stronger than hairline) |
| `--color-rust` | `#d05d38` | Decorative only: marker strokes, rule bars, dots |
| `--color-rust-text` / `--color-rust-tint` | `#a3472b` / `#fbece5` | "Partial match" badge text and fill, eyebrows, highlights |
| `--color-sage` | `#8f9c5e` | Decorative only: status dots, progress fill |
| `--color-sage-text` / `--color-sage-tint` | `#5b6538` / `#eef0e4` | "Eligible" badge text and fill, check icons |

The `-text` shades clear 4.5:1 on their tints and on white. Never set text in plain `rust` or `sage`.

## Tokens: Typography

| Family | Variable | Use |
|--------|----------|-----|
| Fraunces (SOFT 100, weight 450, size-aware tracking) | `--font-fraunces`, utility `font-display` | Headlines, program names, quoted rules, FAQ questions, numerals |
| Instrument Sans | `--font-instrument-sans` (default `font-sans`) | Everything else |

Utilities in `globals.css`:

| Utility | Size | Line height |
|---------|------|-------------|
| `type-h1` | clamp(40px to 72px) | 1.04 |
| `type-h2` | clamp(32px to 48px) | 1.1 |
| `type-eyebrow` | 13px, 600, +0.08em, uppercase | inherited |

Body copy runs 15 to 18px at `leading-relaxed`, in `ink-secondary`.

- **Size tokens, never px.** Off-scale sizes are rem tokens so type follows the reader's browser text-size setting: `text-caption` 13, `text-body-sm` 15, `text-body-lg` 17, `text-title-sm` 22, `text-title` 28, `text-title-lg` 32, `text-display-sm` 40, `text-display-xl` 80 (px at the default 16px root). Inside `cn()` (the `components/ui` files) use an arbitrary rem value such as `text-[0.8125rem]` instead: `cn` mistakes custom `text-*` tokens for colors and drops one.
- **Tracking scales with size.** `font-display` computes `letter-spacing: min(0em, calc(0.68px - 0.04em))`: 0 at 17px and below, about -0.02em at 32px, -0.03em at 72px. Don't add `tracking-*` to display text.
- **Line breaks.** Headings use `text-wrap: balance`, paragraphs and list items `text-wrap: pretty` (set in the base layer).

## Shape and elevation

| Element | Radius |
|---------|--------|
| Inputs | 10px (`rounded-md`) |
| Buttons | 8px default, 12px large |
| Cards, verdict, preview | 20px (`rounded-2xl`) |
| CTA blocks | 24px (`rounded-3xl`) |
| Chips, badges | full |

- `shadow-card`: resting cards, form, chips.
- `shadow-lift`: the hero preview and hovered feature cards.

## Layout

- Container `max-w-280` (1120px), 16px side gutter on phones, 24px from `sm`.
- Sections breathe: `py-24` to `py-32`. White and tint bands alternate.
- Header is sticky and blurred, and gains a hairline only after scrolling. It goes solid under `prefers-reduced-transparency` (`reduce-transparency:` variant).
- Header is a `1fr auto 1fr` grid with cells pinned to columns, so the nav stays put whether or not the right-hand button shows. The current page's link carries `aria-current="page"` (ink); the header CTA is hidden on `/check`.
- Below `md` the nav lives in `MobileMenu`: a Radix Dialog panel that drops out of the header (solid paper, scrim below the header, spring in, tween out). Below `sm` the header CTA moves into the menu.
- Touch targets: anything tappable is at least 44px on coarse pointers (`pointer-coarse:min-h-11` and similar); the desktop layout is unchanged. Inline text links are exempt.
- Moving content that runs over 5 seconds needs a visible pause control (the program rail has one).
- Every page must render with no horizontal scroll at 375px (an e2e test enforces this on `/check`).

## Pages

| Route | Purpose |
|-------|---------|
| `/` | Landing: hero with product preview, program rail, problem, features, how it works, FAQ, CTA |
| `/check` | Form and result column plus a sticky aside (tips, covered programs) |
| `/methodology` | How the agent decides, the "no rule, no yes" guardrail, result anatomy, limits |
| `/ops` | Internal dashboard, same tokens |

`frontend/src/lib/programs.ts` mirrors `backend/data/programs/` for marketing copy. Update it when the corpus changes.

## Motion

Library: `motion` (`motion/react`). `MotionConfig reducedMotion="user"` in `providers.tsx` drops transform animations for users who ask for reduced motion.

| Pattern | Where | Values |
|---------|-------|--------|
| `Reveal` | Below-the-fold section entrances | opacity plus translateY(16px), 600ms, ease `[0.23, 1, 0.32, 1]`, once, -80px margin |
| `MarkerUnderline` | Under the hero headline | SVG pathLength draw, 650ms, ease `[0.22, 1, 0.36, 1]` |
| Marker sweep | Quoted rule in the preview and verdict | `background-size` 0% to 100%, 800 to 900ms ease-in-out |
| `DrawLine` | How-it-works connector | scaleX 0 to 1, 1.1s |
| Program rail | Landing | CSS marquee, 40s linear, pauses on hover, static wrap under reduced motion |
| Activity to verdict | `/check` | AnimatePresence `mode="wait"`; enter 300ms, exit 120ms; verdict items 300ms, stagger 40ms |
| Press feedback | Buttons, chips | `active:scale-[0.97]`, 150ms |
| Submit label | `/check` button | Idle and pending labels share one grid cell (width never jumps); crossfade with `blur(2px)`, in 150ms, out 100ms; no blur under reduced motion |
| Disabled fade | Inputs, chips, buttons | `opacity` and `background-color` 200ms ease when the form locks during a check |
| Error entrance | Alert, field errors | `@starting-style` (`starting:` variant): opacity plus translateY(-4px), 200ms alert, 150ms field; translate dropped under reduced motion |
| Verdict badge | Eligible, Partial | `scale(0.96)` to `scale(1)` spring (`duration: 0.4, bounce: 0.15`), origin left; Not eligible keeps the plain rise |
| Example fill | Description field | `rust-tint` layer with `mix-blend-multiply` fades out over 600ms on each chip click |

Rules:
- Animate only `transform` and `opacity`, and use full `transform` strings in Motion so it stays on the compositor. The marker sweep's `background-size` is the one exception: it plays once per result.
- Every moving Motion element carries `motion-reduce:transform-none!`. `MotionConfig reducedMotion="user"` only covers `x`/`y`/`scale` shorthands, and `useReducedMotion()` causes a hydration mismatch.
- Above-the-fold entrances use the CSS `animate-rise-in` utility (staggered with `[animation-delay:60ms]` steps), never Motion, so nothing waits on hydration. The `/check` tool page has no entrance motion at all.
- Tailwind v4 `scale-*` and `translate-*` set standalone `scale` and `translate` properties. Transition them by name: `transition-press` for pressables, `transition-[translate]` for lifts. A `transform` transition never animates them.
- Hover motion uses the `hover-fine` variant, which requires `(hover: hover) and (pointer: fine)`.
- Focus rings appear instantly (`focus-visible:transition-none`): focus usually comes from Tab, and keyboard actions are never animated.
- Never animate keyboard-driven or repeated actions such as typing or field focus.
- Exits are faster than enters.
- Tailwind v4's `hover:` already only applies on hover-capable devices, so hover lifts are safe on touch.

## Do and don't

- Do keep one primary (brown) button per view. The secondary action is `variant="outline"`.
- Do quote real corpus text in any illustrative result. Never invent a rule.
- Do pair every status color with an icon and a label.
- Don't introduce a dark theme; the plan is light only.
- Don't add new hues. Status is sage (positive), rust (partial), or neutral ink (not eligible).
- Don't use the decorative `rust` or `sage` for text.
