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
| Fraunces (SOFT 100, weight 450, -0.02em) | `--font-fraunces`, utility `font-display` | Headlines, program names, quoted rules, FAQ questions, numerals |
| Instrument Sans | `--font-instrument-sans` (default `font-sans`) | Everything else |

Utilities in `globals.css`:

| Utility | Size | Line height |
|---------|------|-------------|
| `type-h1` | clamp(40px to 72px) | 1.04 |
| `type-h2` | clamp(32px to 48px) | 1.1 |
| `type-eyebrow` | 13px, 600, +0.08em, uppercase | inherited |

Body copy runs 15 to 18px at `leading-relaxed`, in `ink-secondary`.

## Shape and elevation

| Element | Radius |
|---------|--------|
| Inputs | 10px (`rounded-md`) |
| Buttons | 8px default, 12px large |
| Cards, verdict, preview | 16px (`rounded-2xl`) |
| CTA blocks | 24px (`rounded-3xl`) |
| Chips, badges | full |

- `shadow-card`: resting cards, form, chips.
- `shadow-lift`: the hero preview and hovered feature cards.

## Layout

- Container `max-w-280` (1120px), 16px side gutter on phones, 24px from `sm`.
- Sections breathe: `py-24` to `py-32`. White and tint bands alternate.
- Header is sticky and blurred, and gains a hairline only after scrolling.
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
| `Reveal` | Section entrances | opacity plus translateY(16px), 600ms, ease `[0.23, 1, 0.32, 1]`, once, -80px margin |
| `MarkerUnderline` | Under the hero headline | SVG pathLength draw, 650ms, ease `[0.22, 1, 0.36, 1]` |
| Marker sweep | Quoted rule in the preview and verdict | `background-size` 0% to 100%, 800 to 900ms ease-in-out |
| `DrawLine` | How-it-works connector | scaleX 0 to 1, 1.1s |
| Program rail | Landing | CSS marquee, 40s linear, pauses on hover, static wrap under reduced motion |
| Activity to verdict | `/check` | AnimatePresence `mode="wait"`; enter 300ms, exit 150ms; verdict sections stagger 60ms |
| Press feedback | Buttons, chips | `active:scale-[0.97]`, 150ms |

Rules:
- Animate only `transform` and `opacity`, and use full `transform` strings in Motion so it stays on the compositor. The marker sweep's `background-size` is the one exception: it plays once per result.
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
