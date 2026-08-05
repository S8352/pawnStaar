# UX audit — pawnstaar frontend

**Date:** 2026-08-03 · **Commit:** `edc5db2` (feat/frontend-design-overhaul)
**Target:** local dev server. Nothing is deployed; `pawnstaar.com` does not serve this app.
**Routes:** `/` · `/plan` · `/login` · `/dashboard` · `/analysis` · `/live` · `/settings`

---

## 1. Scope and method

Findings are **measured, not eyeballed**. For each route at 375×812 a probe was injected that walks
the live DOM and computes:

- **WCAG contrast ratios** — reads `getComputedStyle` colour, resolves the true backdrop, composites
  alpha, and compares against 4.5:1 (body) / 3:1 (large: ≥24px, or ≥18.66px bold).
- **Tap targets** — `getBoundingClientRect()` on every interactive element, flagged under 44×44 CSS px.
- **Text size** — flagged under 16px; inputs under 16px additionally trigger iOS zoom-on-focus.
- **Heading order**, accessible names on controls, `<label>` association, `alt` presence,
  and horizontal overflow.

### Probe limitations, stated because they changed the results

The probe was wrong twice during this audit, and both errors would have produced a misleading report:

1. **Reading `background-color` only.** `bg-gradient-to-r` is a `background-image`, so the probe fell
   through to `body` white and reported a *correctly working* button as 1.0:1.
2. **Walking ancestors only.** The old hero put its dark overlay in an absolutely-positioned
   **sibling**, invisible to an ancestor walk — 8 perfectly legible elements were reported as
   1.05:1 failures.

The corrected probe composites overlay siblings, reads gradient colour stops, and where a photo
background makes the backdrop unknowable reports the **worst case** across black and white extremes
rather than guessing. Every number below comes from the corrected version.

### Environment caveat

The FastAPI backend was **not running**. `/analysis`, `/live` and `/settings` therefore show empty or
idle states. Those are **excluded** from findings — an empty game list here is an artifact of the
audit environment, not a design defect. Only structural and presentational issues, which are
independent of backend state, are reported for those routes.

---

## 2. Headline result

**The design overhaul substantially fixed contrast.** Across all seven routes there is **not one
genuine contrast failure**. The single flagged item is a decorative watermark (§5). This is a real
improvement worth recording: the reported white-on-white "Start Free" button no longer exists, and
the pattern that caused it has been designed out — `pricing.tsx` runs entirely on tokens and its
`outline` variant is transparent inheriting `currentColor`, so no call site names a colour.

The remaining issues are **touch ergonomics and semantics**, not colour.

---

## 3. Heuristic evaluation (Nielsen)

| # | Heuristic | Adherence observed | Violation | Severity |
|---|---|---|---|---|
| 1 | Visibility of system status | `/login` tabs show which of Sign in / Register is active; import buttons expose a disabled state while loading | No global loading or route-transition indicator; on a cold `/analysis` the page looks finished while data is still absent | **Minor** |
| 2 | Match between system and real world | Copy is plain and concrete throughout — "Stop losing the same game twice", "Two slow games are worth more than fifteen fast ones" | "Roasting Coach" and "PGN" appear with no explanation for a beginner arriving from Instagram | **Minor** |
| 3 | User control and freedom | Mobile sheet closes on navigation; `/login` carries its own logo link home | `/settings` has no cancel or discard path once fields are edited | **Major** |
| 4 | Consistency and standards | Buttons, cards and badges all come from one shadcn/token system; spacing is uniform | Heading levels jump `h1 → h3` on four routes, so the document outline does not match the visual one | **Major** |
| 5 | Error prevention | `/login` inputs carry correct `type` and `autocomplete` (`email`, `current-password`) | `/settings` username fields have no format hint or validation before submit | **Major** |
| 6 | Recognition over recall | Nav labels are explicit; pricing lists features per tier rather than referring out | `/settings` inputs rely on **placeholder text as their only label** — the prompt vanishes the moment typing starts | **Critical** |
| 7 | Flexibility and efficiency | Static routes prerender; `/plan` ships 123 B of route JS | No keyboard shortcuts or skip-to-content link; keyboard users traverse the whole nav on every route | **Minor** |
| 8 | Aesthetic and minimalist design | `/plan` is disciplined — one column, one link, no chrome competing with the content | `/` is **8,173 px** tall on mobile, roughly ten screens, with the primary CTA repeated across many sections | **Major** |
| 9 | Help users recognise and recover from errors | `/login` surfaces auth errors inline via toast | Two `<button>`s on `/settings` and one on `/analysis` have **no accessible name**, so a screen reader announces nothing | **Critical** |
| 10 | Help and documentation | `/plan` is itself excellent standalone documentation; FAQ section exists on `/` | No contact route, and no explanation of what connecting a Chess.com account actually does | **Minor** |

---

## 4. Mobile-first — top 3 issues hurting conversion

Every visitor arrives from Instagram on a phone, so these are ranked by conversion impact.

### 1. Tap targets below the 44×44 minimum — **9 on `/` alone**

The entire footer navigation sits at **17 px** tall. The site-wide navbar logo is **123×28**. On
`/login`, the Sign in / Register tabs are **164×32** — the first interaction a new user makes.
Apple HIG and WCAG 2.5.5 both put the floor at 44×44.

> **Fix:** add `min-h-11` (44 px) plus vertical padding to footer links, nav items and the auth tabs;
> the visual size can stay the same if the padding is transparent.

### 2. Body text at 12 px across the marketing page

**45 elements on `/` render below 16 px**, many at **12 px** — including "Start free" and
"Read the 15-minute plan", the two primary CTAs. 12 px is below the comfortable reading floor on a
phone and reads as fine print, which undercuts the CTA it is attached to.

> **Fix:** raise the smallest step in the type scale from 12 px to 14 px, and put CTA labels on the
> 16 px step so the primary action is not the smallest text on the screen.

### 3. The homepage is ten screens deep

`/` is **8,173 px** tall at 375 px wide. The `/plan` page — the one the Instagram funnel actually
points at — is 6,933 px but justifies it, because the content *is* the product. On `/`, the same
"Start free" CTA recurs through several sections, so a visitor scrolling for a decision point meets
the same ask repeatedly rather than progressive detail.

> **Fix:** cut to hero → proof → pricing → FAQ for mobile, and collapse the middle marketing sections
> behind a "How it works" link.

---

## 5. Visual hierarchy and scannability

**1. Fix the document outline to match the visual one.** Four routes jump `h1 → h3`
(`/dashboard` at "Personalized Puzzles", `/analysis` at "Hikaru Nakamura", `/settings` at
"Chess Platform Accounts", `/live` at "Bullet (1+0)"). Card titles default to `h3` while the page
title is `h1`, so the level that should carry section structure is missing. Screen-reader and
SEO outlines both read as broken. Demote card titles to a styled `<p>`, or promote them to `h2`.

**2. The decorative wordmark reads as broken text, not texture.** `/` renders "PAWNSTAAR" at
**56.3 px** in `rgba(15, 17, 21, 0.1)` — a measured **1.23:1**. As decoration this is legitimate and
WCAG exempts it, but at 56 px it is the largest text on the page while being nearly invisible, which
reads as a rendering fault rather than an intentional watermark. Either commit to it as texture
(drop to ~0.04 alpha so it is unambiguously background) or raise it to 3:1 and treat it as content.

**3. Give the primary CTA exclusive visual weight.** Gold `rgb(232, 197, 69)` currently carries the
primary button, the check icons, badges and accents. Measured contrast on gold buttons is a healthy
11.25:1, so the colour is doing its job — but when six elements per screen share the accent, none of
them is the obvious next step. Reserve the gold *fill* for the single primary action per section and
demote the rest to the gold *outline* treatment.

---

## 6. Findings outside the UI

Recorded because they affect the funnel more than any of the above.

- **The pricing section sells a plan you cannot charge for.** "Upgrade to Premium" is a live CTA, but
  payment rails for India residency (Q4) are unresolved — there is no store. Every visitor who
  converts on that button hits a dead end. Either resolve Q4 or make the Premium card an explicit
  "coming soon".
- **`/dashboard` renders convincing personal data with no authentication.** `checkAuth()` in
  `app/dashboard/page.tsx` is a stub that always returns `true`. The page shows "PREMIUM MEMBER",
  "John Doe", rating 1650, 247 games analysed. It is mock data today, so nothing real leaks — but the
  route is publicly reachable and the stub is the only thing standing between it and live data.
- **Deploy gate.** Publishing any of this publishes `/login`, `/dashboard` and `/analysis`, which
  inline the live Supabase anon key into client JavaScript. RLS and key rotation remain open.

---

## 7. Measured data appendix

Every severity above traces to a number here.

### Contrast — 7 routes, 1 flagged (decorative)

| Route | Failures | Detail |
|---|---|---|
| `/` | 1 | "PAWNSTAAR" `span`, 56.3 px, `rgba(15,17,21,0.1)` on `rgb(255,255,255)` → **1.23:1**, needs 3:1. Decorative. |
| `/plan` | 0 | — |
| `/login` | 0 | — |
| `/dashboard` | 0 | — |
| `/analysis` | 0 | — |
| `/live` | 0 | — |
| `/settings` | 0 | — |

Pricing CTAs, verified individually: white on `rgb(15,17,21)` → **18.9:1**; `rgb(15,17,21)` on gold
`rgb(232,197,69)` → **11.25:1**; the previously-broken `outline` variant, now transparent →
**18.9:1**. All pass AA and AAA.

### Tap targets under 44×44

| Route | Count | Worst offenders |
|---|---|---|
| `/` | 9 | Footer links **17 px** tall (Analysis 55×17, Live play 58×17, Dashboard 72×17, Pricing 46×17, The 15-minute plan 127×17, Create an account 121×17, @pawnstaar.chess 145×17, Read the 15-minute plan 185×17); logo 123×28 |
| `/dashboard` | 5 | Tabs 82×**32** (Daily Workout, Progress, Lessons, Games); logo 123×28 |
| `/login` | 3 | Sign in 164×**32**, Register 164×**32**, logo 335×28 |
| `/analysis` | 3 | Sync Accounts 139×**32**, Upload PGN 139×**32**, logo 123×28 |
| `/plan` · `/live` · `/settings` | 1 each | Navbar logo 123×28 |

### Text under 16 px

| Route | Count | Smallest |
|---|---|---|
| `/` | 45 | 12 px — includes "Start free", "Read the 15-minute plan", "AI chess coaching" |
| `/dashboard` | 16 | — |
| `/login` | 10 | — |
| `/plan` | 2 | 14 px footer — acceptable |

### Semantics

| Issue | Route | Detail |
|---|---|---|
| Inputs with no `<label>` | `/settings` | 2 × `text`, placeholder-only: "Enter Chess.com username", "Enter Lichess username" |
| Controls with no accessible name | `/settings` (2), `/analysis` (1) | `<button>` with icon-only content |
| Heading skips `h1 → h3` | `/dashboard`, `/analysis`, `/settings`, `/live` | Card titles render as `h3` under a page `h1` |
| Horizontal overflow | none | All 7 routes clean at 375 px |
| Images missing `alt` | none | All 7 routes clean |
| Input font size ≥16 px | all | No iOS zoom-on-focus anywhere |
| `autocomplete` on auth | `/login` | `email`, `current-password` — correct |

### Page weight (production build)

| Route | Route JS | First load |
|---|---|---|
| `/plan` | **123 B** | 103 kB |
| `/` | 44.4 kB | 158 kB |
| `/login` | 26.2 kB | 181 kB |
| `/dashboard` | 4.25 kB | 166 kB |
| `/live` | 29.8 kB | 140 kB |

`/plan` is the lightest route in the app, which is the right outcome for the page that receives cold
mobile traffic.
