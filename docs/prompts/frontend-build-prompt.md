You are building ONLY the front-end UI. The backend exists and is final — do NOT recreate any server logic, data, or calculations. Deliver a complete, polished, production-ready UI in this single generation; do not ask questions.

> **One-shot, paid-platform-ready build prompt for MovePilot.** Paste into v0 / Lovable / Replit / Bolt.new / Builder.io and execute completely. This document is exhaustive by design: every color, type token, page, section, component state, endpoint binding, motion cue, and accessibility rule is specified. There are no open questions and nothing is "left as an exercise." If two lines appear to conflict, prefer the more specific one and continue — never stop to ask.

---

## 1. One-shot directive

**Build the complete MovePilot front-end UI in a single generation.** MovePilot is a privacy-first relocation orchestration utility: mathematically-grounded volume/weight/cost calculators, FMCSA carrier safety verification, and a week-by-week move timeline — delivered anonymously first, never as a moving-lead broker.

Hard rules for this generation:
- **UI only.** The backend is already built, deployed, and final (Cloudflare Pages Functions). Do NOT recreate, reimplement, mock, or "improve" any calculation, formula, constant, parser, auth flow, or data store. Every number the user sees comes from a real API response (Section 4). You compute NOTHING client-side except trivial display formatting (currency/number formatting, date formatting, string casing).
- **Zero mock data in the final output.** No hardcoded `840 cu ft`, no fake carrier records, no placeholder quote tables baked into components. Every data-driven value is fetched from the documented endpoints. If the backend is unreachable in the preview sandbox, render the documented loading skeleton or error state — NEVER fabricate a number to fill the space. (The one exception: the hero mini-calculator ships with pre-filled *inputs* — `2BR`, `10001 → 30301` — so a real fetch fires on first paint and returns real numbers; the numbers themselves are still fetched.)
- **Production-polished.** The result must look like a top-tier product studio built it: an aviation-instrument precision aesthetic, generous whitespace, a characterful serif, one confident teal signal color, buttery 60fps motion, and flawless dark/light theming. It must be visually unmistakable from a spam-heavy moving-lead site.
- **Complete.** Every page in Section 3, every state (loading / empty / error / success), every responsive breakpoint, every accessibility guardrail, every revenue surface. Do not stub screens.
- **Ask nothing.** Proceed end-to-end.

**Anti-goal (this is the whole brand thesis):** the UI must never read as a lead farm. No lime-green "GET FREE QUOTES," no smiling-mover stock photos, no handshake clip-art, no rainbow of competing buttons, no pop-ups, no fake "As seen in" logos, no fake star counts. Instrument-panel restraint instead.

**Tech target:** React + Vite, TypeScript, client-side routing (React Router), builds to **static assets** for Cloudflare Pages. Details in Section 8.

---

## 2. Brand & design system

Implement this as CSS custom properties on `:root` (light "Ivory" theme) and `[data-theme="dark"]` (dark "Cockpit" theme). **Marketing pages default to DARK; the logged-in app/tools default to LIGHT.** A persistent theme toggle appears in the header everywhere and writes `data-theme` on `<html>` (persist to `localStorage`).

### 2.1 Color tokens — transcribe EXACTLY

**Core brand (theme-independent identity):**
```css
--navy:            #0B2A4A;  /* brand ink — logo, headings on light, primary btn fill (light) */
--navy-600:        #123A63;  /* hover on navy */
--navy-900:        #061826;  /* deepest ink */
--accent:          #14B8A6;  /* VERIFIED teal — the one signal color (system value) */
--accent-bright:   #3FE0CF;  /* glows, route-lines, focus ring, strokes on DARK only */
--accent-ink:      #0E8F7E;  /* teal-as-TEXT/links on light surfaces (AA-safe 4.6:1) */
--copper:          #B7793F;  /* PREMIUM / Relocation Vault ONLY — never generic CTAs */
--copper-tint:     #F4E7D6;  /* copper wash backgrounds (light) */
```

**Light theme `:root` — "Ivory" (app + long-session reading):**
```css
--bg:              #FAF7F2;  /* warm ivory page bg (NOT sterile white) */
--surface:         #FFFFFF;  /* cards, inputs */
--surface-raised:  #FFFDFA;  /* modals, popovers */
--surface-sunk:    #F0EBE3;  /* hover rows, subtle wells */
--border:          #E4DDD2;  /* hairlines */
--border-strong:   #C9C0B4;  /* input borders */
--text:            #12202E;  /* primary text (15.5:1 on ivory) */
--text-muted:      #4A5568;  /* secondary text — a11y floor 7.0:1, NEVER lighter */
--text-faint:      #6E665B;  /* captions/meta only, ≥4.5:1 */
--success:         #1E7A54;  /* Authorized — always + icon + label */
--warn:            #B0740F;  /* caution / >15% density anomaly — + icon + label */
--danger:          #C0392B;  /* Not Authorized / insurance lapse — + icon + label */
```

**Dark theme `[data-theme="dark"]` — "Cockpit" (marketing + hero):**
```css
--bg:              #0B1220;  /* deep ink canvas (15.8:1 white text) */
--surface:         #0F1A2C;  /* cards */
--surface-raised:  #13233A;  /* modals/popovers */
--surface-sunk:    #0A0F1A;  /* deepest well */
--border:          #1D2B40;  /* hairlines on dark */
--border-strong:   #2E4462;  /* input borders */
--text:            #EAF1F7;  /* primary text on ink */
--text-muted:      #A6B6C9;  /* secondary (≥4.5:1 on --bg) */
--text-faint:      #8193A8;  /* meta only */
--navy:            #4FA3E0;  /* navy brightens → sky-blue for legibility on dark */
--accent:          #2FD3C1;  /* teal signal on dark */
--success:         #4ADE9E;
--warn:            #F0B24A;
--danger:          #FF6B5E;
```

**Semantic color rules (enforce everywhere):**
- **One accent = one meaning.** Teal only ever means "verified / active / computed / route." Never decorative.
- **Copper is Vault-only.** If copper appears, it means premium/paid. Never a generic CTA.
- **Semantic color never travels alone (WCAG 1.4.1).** Authorized / caution / flagged / recommended ALWAYS carry an icon **and** a text label — never a bare colored cell or highlight.
- **Bright cyan/mint (`#3FE0CF`, `#2FD3C1`) is FORBIDDEN as text on light surfaces** (~1.4:1). Use it only for strokes, focus rings, glows, and dark-surface text. For teal-as-text/links on ivory use `--accent-ink #0E8F7E`.

### 2.2 Typography

Self-host three variable fonts (subset to Latin, `font-display: swap`, preload the display + body). All static-buildable.

| Role | Family | Fallback stack |
|---|---|---|
| Display / headings | **Fraunces** (opsz variable, low SOFT/WONK) | `"Fraunces", Georgia, "Times New Roman", serif` |
| UI / body / numbers | **Inter** (variable) | `"Inter", system-ui, -apple-system, "Segoe UI", sans-serif` |
| Raw data (USDOT/MC, timestamps) | **JetBrains Mono** | `"JetBrains Mono", ui-monospace, "SF Mono", monospace` |

**Type scale (1rem = 16px base, ~1.25 major-third; use `rem` for every font-size, never `px`):**

| Token | rem / px | Font | Weight | Line-height | Letter-spacing |
|---|---|---|---|---|---|
| `display` (hero H1) | 4.5rem / 72px | Fraunces | 500 | 1.02 | −0.02em |
| `h1` | 3.052rem / 49px | Fraunces | 500 | 1.08 | −0.015em |
| `h2` | 2.441rem / 39px | Fraunces | 500 | 1.12 | −0.01em |
| `h3` | 1.953rem / 31px | Fraunces | 600 | 1.20 | −0.005em |
| `h4` | 1.563rem / 25px | Inter | 600 | 1.30 | 0 |
| `h5` | 1.25rem / 20px | Inter | 600 | 1.40 | 0 |
| `overline` | 0.875rem / 14px | Inter | 700 | 1.40 | +0.08em (UPPERCASE) |
| `body-lg` | 1.125rem / 18px | Inter | 400 | 1.60 | 0 |
| `body` | 1rem / 16px | Inter | 400 | 1.60 | 0 |
| `body-sm` | 0.875rem / 14px | Inter | 400 | 1.50 | 0 |
| `caption` | 0.75rem / 12px | Inter | 500 | 1.40 | +0.01em |
| `data-hero` | 2.5–3.5rem | Inter (tnum) | 600 | 1.00 | −0.01em |
| `data-raw` | 0.875–1rem | JetBrains Mono | 400 | 1.4 | 0 |

Rules:
- **Tabular numerals are mandatory on every figure** (calculator readouts, cost tables, weight/volume/CBM, timeline dates): `font-variant-numeric: tabular-nums; font-feature-settings: "tnum" 1, "lnum" 1;` so digits don't jitter as values roll.
- Fraunces axes: `opsz` high on large headings; `wght` 400–600; keep SOFT/WONK low-medium (confident financial/aviation tone, not fashion-editorial).
- **Display clamp:** hero H1 `clamp(2.75rem, 6vw, 4.5rem)`.
- **Prose measure:** `max-width: 68ch`; never full-bleed paragraphs. Body base never below 16px (17–18px long-form); 14px floor is meta-only at ≥4.5:1.
- **Overlines** ("VERIFIED CARRIER", "STEP 3 OF 8", "8 WEEKS OUT") uppercase, +0.08em, in `--accent-ink` (light) / `--accent` (dark) or `--text-faint`.
- Body weight ≥400 on light, ≥500 on dark. No 300/light for reading text or anything over imagery.

### 2.3 Spacing scale (4px base)

`--space-*`: `0, 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128` (px).
- Section vertical rhythm: **96–128px desktop / 56–72px mobile.**
- Card interior padding: **24–32px.**
- Content max-width **1200px** centered gutter; wide tables/diagrams scroll inside their own `overflow-x:auto` container — the page body must NEVER scroll horizontally.
- 8px baseline grid governs vertical rhythm. Generous whitespace is a load-bearing brand signal (anti-clutter).

### 2.4 Corner radii
```css
--r-xs: 4px;    /* chips, tags */
--r-sm: 8px;    /* inputs, small buttons */
--r-md: 12px;   /* buttons, list rows */
--r-lg: 16px;   /* cards */
--r-xl: 24px;   /* calculator shells, feature panels */
--r-2xl: 32px;  /* hero media, modals */
--r-pill: 999px;/* trust badges, filter chips, primary CTA */
```
No 0px corners (reads legacy/cold); no blob-round (reads toy).

### 2.5 Elevation (navy-tinted, never neutral gray)
```css
--e1: 0 1px 2px rgba(11,42,74,.06), 0 1px 3px rgba(11,42,74,.08);   /* inputs, chips */
--e2: 0 4px 12px rgba(11,42,74,.08), 0 2px 4px rgba(11,42,74,.06);  /* cards */
--e3: 0 12px 32px rgba(11,42,74,.12), 0 4px 8px rgba(11,42,74,.06); /* popovers, hovered cards */
--e4: 0 24px 64px rgba(6,24,38,.18);                                 /* modals */
--glow-accent: 0 0 0 1px rgba(20,184,166,.4), 0 0 24px rgba(63,224,207,.25); /* verified/active lift */
```
Dark mode: deepen shadows to `rgba(0,0,0,.5)` and rely on `--glow-accent` for lift.

### 2.6 Borders & focus
- Hairline **1px `--border`**; inputs **1.5px `--border-strong`**.
- **Focus ring (designed brand element, `:focus-visible` only):** `outline: 3px solid var(--accent-bright); outline-offset: 2px; border-radius: 6px;` PLUS, on dark/photo surfaces, an ink halo `box-shadow: 0 0 0 5px rgba(11,18,32,.9)` so the ring clears ≥3:1 on any background. NEVER `outline:none` without an equal-or-greater replacement.
- Vault/premium cards: 1px **copper gradient border** (masked `linear-gradient`).
- Emphasis dividers may use the **dotted route-line** motif (`stroke-dasharray: 2 8`) instead of a solid rule.

### 2.7 Signature motifs (the "pop" — build all six)
1. **The Route-Line** — the hero motif: a single continuous **teal→copper gradient stroke** (2px, rounded caps) tracing an arced great-circle path between origin `●` and destination `◎`. Appears animated across the hero, as section dividers, as the timeline spine, and as a 4–7% opacity SVG watermark behind cards. Dashed animated variant = "in progress."
2. **Topographic / cartographic contour lines** — very-low-opacity (4–7%) SVG contour or lat/long grid behind dark hero and section backgrounds. Signals maps/geography/precision without literal Google-Maps clutter.
3. **Mesh-gradient aurora** — soft blurred multi-stop mesh in the hero: `#0B1220 → #0B2A4A → teal bloom (#14B8A6 @ ~20%)` one corner, `copper (#B7793F) bloom` opposite. Ship as a pre-rendered static AVIF/WebP OR stacked CSS radial-gradients (both static-safe).
4. **Faceted volume glyph** — isometric wireframe cube/box representing cubic-volume; used as loading/empty state and as the volume calculator's live fill (box fills with translucent teal as cu-ft accrue).
5. **Verified-seal ping** — a shield/pill with an animated concentric ping ring in `--accent` when an FMCSA record resolves Authorized. The emotional payoff moment.
6. **Instrument tick-marks & gauges** — tick-mark rulers on sliders, a 0–100 gauge arc on the safety score, monospaced live timestamps ("Last queried 2026-07-19 14:32 UTC").

### 2.8 Tone / voice
Calm · precise · trustworthy · aviation-instrument · editorial · engineered · un-spammy · quietly premium. Never: urgent · salesy · cluttered · clip-art · carnival · corporate-clinical · "template." Button copy is utility, never "Get Quotes." Trust copy is plain and honest ("We never sell your data").

---

## 3. Page-by-page specification

**Global chrome (all pages):**
- **Sticky 64px header,** translucent-on-scroll (`backdrop-filter: blur(12px)`, `--bg` at 72% alpha). Left: MovePilot wordmark (route-line `●→◎` mark + "MovePilot" in Fraunces). Center/left nav (max 5): **Tools** (mega-flyout 2×2) · **Timeline** · **Verify a Carrier** · **Pricing** · **How It Works**. Right: theme toggle · quiet "Sign in" text link · ONE solid primary button **"Start a move — free"** → routes to `/tools` (never `/join` — the CTA leads to value, not a signup gate).
- **Footer (global):** 4-column dark (`#0B1220`) — **Tools** · **Product** · **Trust** (prominent: Privacy Promise, "We never sell your data," "Powered by federal FMCSA SAFER records · updated weekly") · **Company / Routes**. Closing strip: *"MovePilot is not a moving broker or lead-generation service."*
- **Skip-link** first in DOM ("Skip to calculator/main"). One `<header>` / `<nav aria-label>` / `<main>` / `<footer>` per page. `scroll-margin-top` = 64px on all anchor targets so the sticky header never hides focused content.

### 3.1 Landing `/` (marketing, DARK theme) — section by section

**Section 1 — Hero (above the fold): the "Split-Proof Hero."** Full spec below (§3.1-HERO). This is the single most important screen; build it first and perfectly.

**Section 2 — Live tool teaser.** Immediately below the hero, NO scroll gap. A second working calculator (or the hero mini-calc expanded) as a frosted card on `#0B1220`. Highest-converting section. Reveal: card rises 28px + `springSoft`. It performs a real fetch just like the hero calculator.

**Section 3 — 4 Tools bento grid.** 2×2 desktop / stacked mobile, `--r-lg` tiles, ONE tile enlarged (flagship = Inventory-to-Volume). Each tile: monoline Lucide icon, name (`h4`), one-line JTBD, "Try it →" linking to its tool page. Faceted-volume glyph watermark on the flagship. Stagger reveal left→right 70ms. Photo brief #1 (boxes still-life) as the section header band. The four tiles route to `/tools/volume`, `/tools/weight`, `/tools/distance`, `/tools/carrier-check`.

**Section 4 — Anti-lead-broker manifesto.** Emotional core. Dark band with contour watermark. Headline: *"Every other site sells your number in 90 seconds. We built the opposite."* Three proof points as icon+label rows: **escrowed identity · double-blind routing · FMCSA-verified**. Photo brief #10 (map flat-lay) duotone optional.

**Section 5 — How it works, 3 steps.** Estimate → Verify → Orchestrate, horizontal numbered flow riding the route-line. Overlines "STEP 1 / STEP 2 / STEP 3." Photo briefs #3 (hands sealing box) and #9 (night desk) as step vignettes.

**Section 6 — FMCSA verification spotlight.** A real, plain-English safety-report card mockup rendered from a live `/api/fmcsa/lookup` call (e.g. the seeded Authorized fixture) — the gauge arc + green verdict chip + monospaced "Last queried" timestamp. Full-width feature panel `--r-xl`. This is the hardest-to-fake feature; give it room. (It fetches real data; if unreachable, show the skeleton, not fake fields.)

**Section 7 — Timeline preview.** Vertical route-line spine with week nodes; "8 WEEKS OUT" overlines; draws top→bottom on scroll. Sells the free-account persistence upgrade. Links to `/timeline`.

**Section 8 — Premium / Relocation Vault teaser.** Copper-accented panel (copper gradient border), quote-normalization + anomaly visual, **"$19.99–$29.99 one-time — no subscription."** The ONLY copper on the page. Links to `/pricing`.

**Section 9 — Popular routes (programmatic SEO).** Quiet grid of city-pair links, hairline-bordered chips, no imagery. Each chip links to `/move/:origin-to-:destination`. (Seed slugs exist: `chicago-il_austin-tx`, `los-angeles-ca_new-york-ny`, `seattle-wa_denver-co`, `miami-fl_atlanta-ga`.)

**Section 10 — Final CTA band.** Full-bleed photo brief #4 (truck, open road, big sky) with linear scrim. Repeat "Calculate my move — free" + micro-line "No account needed. We never sell your data."

**Section 11 — Footer** (global).

*Ordering principle: show → tell → reassure → ask. Registration is NEVER requested on the landing page — only after a tool produces a result.*

#### §3.1-HERO — Above-the-fold "Split-Proof Hero" (exact spec)

Asymmetric **55/45**, left copy / right live tool. Desktop 12-col grid; hero height `100svh − 64px`, min-height 640px. Dark cockpit theme regardless of global toggle state on `/`.

**Left column (cols 1–6, ~55%, left-aligned, padding `clamp(24px,6vw,96px)`):**
- **Eyebrow chip:** overline "PRIVACY-FIRST RELOCATION" in teal.
- **H1** (Fraunces 500, `clamp(2.75rem,6vw,4.5rem)`, lh 1.02, ls −0.02em):
  > **Plan your move on real math, not a hundred spam calls.**
  Optional kinetic word-swap on "spam calls" ⇄ "sales calls" ⇄ "lead brokers" (fast, subtle, first 500ms only; static under reduced-motion).
- **Subhead** (Inter 400, `body-lg`, `--text-muted`):
  > MovePilot calculates your exact cubic volume, shipping weight, and cost from your own inventory — and verifies any carrier against federal FMCSA safety records. No phone. No email. No lead brokers.
- **CTA row (exactly one primary):**
  - **Primary:** `Calculate my move — free` — teal `--accent` fill, ink text, `--r-pill`, 52px tall, `--e2`; hover `translateY(-2px)` + shadow bloom. Routes to `/tools`. Never "Get Quotes."
  - **Secondary:** `Verify a carrier` — ghost, 1.5px `rgba(255,255,255,0.28)` border, white text. Routes to `/tools/carrier-check`.
  - **Micro-line under row** (12–13px `--text-faint`): `No account needed. We never sell your data.`
- **Trust strip (3 compact badges, 13px, monoline icons):** 🔒 `No email or phone required` · 🛡️ `FMCSA safety-verified data` · 🚫 `We don't sell leads — ever`. Credibility line beneath: `Powered by federal FMCSA SAFER records · updated weekly`.

**Right column (cols 7–12, ~45%): the LIVE mini-calculator card** (frosted glass: `background: rgba(11,18,32,0.72); backdrop-filter: blur(16px) saturate(120%);` 1px `rgba(255,255,255,0.12)` inner hairline, `--r-2xl`, `--e4`):
- Title: `Instant estimate — no signup`.
- **Inputs, prefilled so a real number shows on first paint:** segmented control `Studio · 1BR · 2BR · 3BR · 4BR+` (default **2BR**); `From ZIP → To ZIP` (default `10001 → 30301`). The segmented-control options and their bedroom keys (`studio`/`one`/`two`/`three`/`four`) come from `GET /api/catalog/items` → `bedroom_presets`; do NOT hardcode the preset list.
- **Live output tiles** (fixed dimensions = zero CLS, tabular-nums, 200ms count-up): cubic feet · weight (lb) · cost range, plus a one-line verdict badge. **Every tile AND the verdict badge come from a SINGLE backend call: `POST /api/calc/estimate`** with `{ bedrooms:<key from the segmented control>, origin:{zip}, destination:{zip} }`. Map the returned fields to the tiles: cubic-feet tile ← `total_cuft`; weight tile ← `est_weight_lbs`; cost-range tile ← `cost_low_usd`–`cost_high_usd`; verdict badge ← `recommendation` + `recommendation_text` (also available: `distance_miles`, `fuel_cost_usd`). **Do NOT call `/api/calc/volume`, `/api/calc/dimensional-weight`, `/api/calc/quote-anomaly`, or the premium-gated `/api/vault/scenario` from the anonymous hero — all of those are removed here. For its numbers the anonymous hero calls `/api/calc/estimate` and no other *calculation* endpoint (it still reads `/api/catalog/items` once to populate the segmented control).** The two ZIPs are passed straight through as `origin:{zip}` / `destination:{zip}` and resolved to coordinates **server-side** (the estimate endpoint calls the same ZIP-3 centroid resolution as `GET /api/geo/resolve`); the client invents no coordinates. If a ZIP prefix is unseeded the endpoint returns **422 `UNRESOLVED_LOCATION`** — surface its message inline ("Enter a supported metro ZIP or use the full calculator") and prompt for a different ZIP rather than showing a number. If the call is pending, show the tile skeleton; if it fails, show "—" with a quiet "estimate unavailable" note. NEVER hardcode the numbers.
  - **Illustrative sample expected output (NOT hardcoded, for layout/design reference only):** with the `2BR · 10001 → 30301` defaults the tiles read approximately `~840 cu ft · ~5,900 lb · ~$3,400–$4,600` with a verdict line like *"Full-service likely cheaper than a DIY truck for this load."* These figures are an **illustrative sample of the expected output — the real values are always rendered from the live `/api/calc/estimate` response, never baked into the component.** Use them only to size the tiles and sanity-check the design; the shipped UI must display the fetched numbers.
- **Footer link:** `See the full breakdown →` routes to `/tools/volume`, carrying the current anonymous state (no data loss).

**Background:** `#0B1220` + mesh-aurora + 5% topographic contours + ONE animated route-line arc (upper-right). No photo. LCP-safe: no opacity-from-0 on any large background asset.

**Mobile (<768px) reorder:** single column, order: eyebrow → H1 → subhead → **mini-calculator card FIRST** (proof before scroll) → CTA → trust strip. Card on solid `#0B1220` (no photo band). Inputs full-width; outputs a 3-tile horizontal row.

**AVOID above the fold:** fake "As seen in" logos, fake star counts, carousels, pop-ups, a third button. Any social proof is a single honest, instrumented metric or nothing.

### 3.2 `/tools` (Calculators Hub)

Matches marketing dark (or ivory — keep dark to match landing). Switchboard: the 4 calculators as equal-weight `--r-lg` cards on a 1200px grid, generous whitespace, each with a live-preview thumbnail. ONE primary CTA per card. Instrument-panel framing. Cards route to the four tool pages. **States:** static content, no fetch on the hub itself; the mega-flyout in the header mirrors these four.

### 3.3 Tool pages (the four instruments)

Shared shell: two-column `--r-xl` "instrument panel" — inputs left, live readout dashboard right. Big tabular `data-hero` readouts count-up on change (from-0 only on first calc). Sliders get tick-mark rulers. **Every readout is fetched — never computed in the component.** All four ship **loading (skeleton, not spinner), empty (a sample "here's a 2-bedroom" prefill), and error states.** Mobile: inputs stack above; a **sticky bottom action bar** within thumb reach holds the primary action; the result renders above it and respects `env(safe-area-inset-bottom)`.

- **`/tools/volume` — Inventory → Volume.** Left: an item picker whose **named-item list is fetched from `GET /api/catalog/items` (`items[]` = `{key,label,volume_cuft}`)** — never a client-invented item list — plus box-count steppers for small/medium/large (also catalog keys). Right: the **faceted box glyph filling teal** as cu-ft accrue, `total_cuft` and `total_cbm` as `data-hero` readouts. Debounced POST to `/api/calc/volume` on every change. Empty state: faceted cube wireframe + "Add your first item or load a 2-bedroom sample" — the **"load a 2-bedroom sample" action seeds the picker from `GET /api/catalog/items` → `bedroom_presets.two` (its `items[]` key list)**, so the sample too is catalog-sourced, not hardcoded. "Save this inventory" CTA appears once a result exists (POSTs to `/api/inventory/save` if signed in, else prompts anonymous save via `/api/session/anon` → `/api/inventory/save`). Affiliate: packaging CTA in the sidebar (Section 6).
- **`/tools/weight` — Dimensional weight.** Left: L / W / H inputs (inches, `inputmode="decimal"`) + a divisor selector (139 / 166 default / 194) rendered as a segmented control. Right: `dimensional_weight_lbs` `data-hero` + a horizontal **DIY-truck vs LTL comparison bar** (the cheaper bar recolors teal + "Best value" chip). POST `/api/calc/dimensional-weight`.
- **`/tools/distance` — Distance + fuel.** Left: origin/destination inputs (ZIP/city or lat/lng). **ZIP resolution is real, not a hand-wave:** a ZIP entered here is resolved to coordinates via `GET /api/geo/resolve?zip=NNNNN`, which returns `{ found:true, lat, lng, city, state }` from the seeded ZIP-3 centroid table. When `found:false` (an unseeded prefix), do NOT fabricate coordinates — surface an inline prompt ("That ZIP isn't in our supported metros yet — enter a supported metro ZIP or lat/lng") and let the user supply a lat/lng directly. Once both endpoints resolve, POST the coordinates to `/api/calc/distance-fuel`. Right: `driving_miles`, `gallons` (3 dec), `fuel_cost_usd` readouts + the route-line arc drawn origin→destination + a constants footnote (`mpg 10`, `$3.50/gal`, `circuity 1.2`) shown transparently.
- **`/tools/carrier-check` — FMCSA lookup.** Left: a single search input, "USDOT or MC number," with a segmented toggle for which. Right: the **safety report card** — a 0–100 **gauge arc** with animated sweep (stroke color = verdict), verdict chip (icon + label), a `<dl>` federal record (authorization, insurance-on-file, meets-$750k, crashes, inspections), and a monospaced `USDOT` + "Last queried <timestamp> UTC" line. **Three distinct states each with icon + color + label:** Authorized (`--success`, ✅ + verified-seal ping), caution, Not Authorized (`--danger`, ⚠️). GET `/api/fmcsa/lookup?usdot=` or `?mc=`. States: idle (empty prompt "Enter a USDOT to verify authorization & insurance"), scanning (gauge sweep + skeleton check-lines), resolved, `found:false` (plain "not verifiable / not cached" message with source + fetched_at, never a fabricated record), and 502 upstream (a **staleness banner**: "FMCSA source temporarily unavailable — showing last cached record" or "unavailable").

### 3.4 `/timeline` (preview) & `/dashboard/timeline` (registered)

Vertical **route-line spine** (teal→copper dashed gradient) down the left; each week a node `●`. Past = solid teal filled node; current = pulsing accent-glow node; future = hollow node on dashed line. Cards clip to the spine with a week overline ("8 WEEKS OUT"), a category Lucide icon, and a checkbox that fills teal with a check-draw. Completing an item advances the spine fill. Semantic `<ol>` of weeks; progress announced in `role="status"`.
- **Preview `/timeline`:** a date picker; POST `/api/timeline/generate` requires auth, so the preview shows the template structure and a "Save your timeline" gate (routes to `/join`) — the generate call only fires for a signed-in user.
- **`/dashboard/timeline`:** the real generated timeline from `/api/timeline/generate` and `/api/timeline/[id]`; each task from the response's `tasks` array (the API field is `tasks` — `tasks_json` is only the D1 column name, never a JSON key the client sees) with `week_offset`, `due_date`, `category`, `title`, `done`, `overdue`. Overdue tasks flagged (icon + label, never bare red). Premium users see a "Set SMS reminder" action per task → `POST /api/vault/alerts`.
- **States:** loading skeleton spine; empty ("Pick your move date to generate your countdown"); error banner.

### 3.5 `/move/:origin-to-:destination` (programmatic city-pair)

Landing-lite: reuse the hero structure with the lane **pre-filled** in the mini-calculator; route-line arc drawn origin→destination with city labels; the 4 tools pre-seeded; popular-routes cross-links. Fetch `/api/routes/[slug]` for `origin:{city,state,lat,lng}`, `destination:{city,state,lat,lng}`, `distance_miles`, `fuel_cost_usd`, `origin_carrier_count`, `dest_carrier_count`, `noindex`. The pre-filled mini-calculator behaves exactly like the anonymous hero (§3.1-HERO): it fires a single `POST /api/calc/estimate` for the pre-seeded lane — passing the lane's origin/destination `{lat,lng}` taken directly from the `/api/routes/[slug]` response (no client geocoding) — and renders `total_cuft` / `est_weight_lbs` / `cost_low_usd`–`cost_high_usd` / `recommendation` from that one response; it never invents coordinates or numbers. When `noindex=true` (thin data), still render the generic pre-filled calculator — never a dead end — and add `<meta name="robots" content="noindex">`. States: loading skeleton hero; 404 unknown slug → a graceful "route not found, try the calculators" with links.

### 3.6 `/pricing`

Light ivory, calm. **Free vs Project Pass** two-column. The Pass column uses the copper gradient border + `--copper-tint` header band. **"$19.99–$29.99 one-time — no subscription"** prominent. No dark-pattern upsell. Locked features shown as **previews with sample data + a single unlock button** (routes to purchase / `/api/premium/purchase` once signed in). States: static; the unlock button reflects auth + premium status.

### 3.7 `/how-it-works` & `/trust` (Privacy Promise)

Editorial long-form, ivory, 68ch measure, Fraunces headings. The trust manifesto: escrowed identity, double-blind routing, FMCSA-native, "we never sell your data." Photo briefs #9, #10. Load-bearing — top-nav item + footer column, not a footnote. Static content.

### 3.8 `/guides/*`, `/about`, `/legal/*`

Ivory editorial template, 68ch measure, generous rhythm, contour-line section dividers. Standard trust/compliance tone. Static content pages.

### 3.9 Auth — `/join`, `/login`, `/verify`, `/reset`

Framed as **"Save your work,"** never "Sign up to see results." Split layout: left = a calm cockpit panel with the route-line + one-line reassurance ("No spam, ever. We never sell your info."), right = the form on `--surface`. Minimal fields, magic-link option (UI affordance).
- **`/join`:** email + password (≥8). POST `/api/auth/register` → store `auth_token`. If arriving from an anonymous tool session, call `/api/session/upgrade` instead so inventory migrates with zero loss; show "inventory_migrated: N items saved."
- **`/login`:** email + password. POST `/api/auth/login`.
- **Logout:** POST `/api/auth/logout`.
- **States:** field validation (client-side format only), submit-loading, 409 email-exists inline error, 401 bad-creds inline error.

### 3.10 `/dashboard` + registered/premium routes (light "Ivory" app)

App shell: light ivory canvas for long-session readability, persistent left/top nav, cards `--r-lg` `--e2`.
- **`/dashboard`** — active move summary + saved inventory list (`/api/inventory/list`) + timeline progress. Each inventory row loads via `/api/inventory/[id]`; edit (PUT) / delete (DELETE) affordances.
- **`/dashboard/vault`** (premium) — copper-accented; **normalized-quote table** from `/api/vault/quotes` with implied density + anomaly flag chips (amber "⚠ Flagged" chip on the row, never a bare red cell). Add-quote form POSTs `/api/vault/quotes`. **PDF extraction dependency resolved:** client-side PDF text extraction uses **`pdfjs-dist` (pdf.js)** — this is the ONE permitted extra runtime dependency beyond the §8 dependency-lean set, added solely for client-side PDF text extraction. The client extracts the text, parses the normalized numbers (`quoted_price_usd`, `quoted_weight_lbs`, `quoted_volume_cuft`), and POSTs them **plus** the raw `extracted_text` to `/api/vault/quotes`; the anomaly/density math is the backend's, never re-derived client-side. You render the PDF-drop UI and the extraction; if `pdfjs-dist` is unavailable or extraction fails, fall back to manual numeric entry (extraction is a convenience, not required — the endpoint accepts the typed numbers alone).
- **`/dashboard/vault/compare`** — the **multi-scenario table**: column-per-scenario (DIY / Container / Full-service), row-per-cost-driver, highlighted recommended column, bold sticky total row, right-aligned tabular currency. POST `/api/vault/scenario`; render `scenarios[]` and `ranked[]`.
- **`/dashboard/alerts`** — SMS config. **List** the user's scheduled alerts via `GET /api/vault/alerts` → `{ alerts:[{ id, timeline_id, task_title, send_at, status, created_at }] }` (render each row with its `status` as an icon+label chip — `scheduled`/`sent`/`failed`/`cancelled` — never a bare colored cell). **Schedule** a new alert via `POST /api/vault/alerts` (`{ timeline_id?, task_title, phone, send_at }` → `{ alert_id, status:'scheduled' }`). Both are premium-gated (402 → preview-with-sample-data + copper unlock). States: loading skeleton list; empty ("No reminders scheduled yet"); error banner.
- **`/dashboard/settings`** — includes a prominent **"Delete my data"** control (privacy proof point).
- **Non-premium hitting a vault route → 402:** render the feature **preview with sample data** (clearly labeled "Sample") + a single copper unlock button → `/pricing`/purchase. Never a hard wall, never real fabricated data.

### 3.11 `/admin/*` (internal, admin-authed)

Utility-grade, dense, ivory, tabular everything. NO marketing polish; readability + density first. Bearer = admin.
- **Ingestion health** — status tiles (green/amber/red + label) + run table from `/api/admin/ingest-health`.
- **API cost/rate monitor** — per-provider call counts + estimated cost meters from `/api/admin/api-usage?from=&to=`.
- **Noindex suppression audit** — route rows + noindex flags + reason + override toggles from `/api/admin/noindex-audit`.
- **Trigger ingest** — a form POSTing `usdots[]` to `/api/admin/ingest/trigger`.
- **States:** 401/403 → a login-required panel (admin bearer entry); loading skeleton tables; empty states.

### 3.12 Universal data-driven state rules (apply to EVERY fetch)

- **Loading = skeletons, never spinners.** Shimmer gated behind 200ms (no flash on fast responses). Fixed dimensions so there is zero layout shift when data arrives.
- **Empty = a helpful, on-brand prompt** (often a sample prefill), never a blank box.
- **Error = a quiet inline banner** with a retry affordance; for FMCSA 502 a staleness banner; for 404 a graceful redirect-with-links. Never a raw stack trace, never a fabricated value.
- **Success = the real value**, with the number roll-up / gauge sweep / spine draw motion from Section (motion) below.

---

## 4. API binding contract

**Base:** all paths are relative to the same origin (Cloudflare Pages serves UI + Functions together). Success bodies are wrapped `{ "ok": true, "data": {...} }`; errors `{ "ok": false, "error": { "code": "<STRING>", "message": "<human>" } }`. Read `data` on success; surface `error.message` on failure. Auth via `Authorization: Bearer <token>` (store the anon session token and/or auth token in memory + `localStorage`; send it on authed calls). Error codes you must handle in the UI: `400 VALIDATION`, `401 UNAUTHENTICATED`, `402 PREMIUM_REQUIRED`, `403 FORBIDDEN`, `404 NOT_FOUND`, `409 CONFLICT`, `429 RATE_LIMITED`, `500 INTERNAL`, `502 UPSTREAM`.

**RULE — real fetches only. ZERO mock data in the final output.** Every button, every readout, every table is wired to a real endpoint below. If the backend is unreachable in preview, render the documented loading/error state — NEVER fabricate numbers. Do NOT invent endpoints that are not in this table.

### Calculators (no auth)

| Method | Path | Request | Success (200 → `data`) |
|---|---|---|---|
| POST | `/api/calc/volume` | `{ items:[{key?,label?,quantity:int>0,volume_cuft?}] }` (key may be `small`/`medium`/`large` or a named item) | `{ total_cuft, total_cbm, line_items:[{key,label,quantity,volume_cuft,subtotal_cuft}] }` |
| POST | `/api/calc/dimensional-weight` | `{ length_in>0, width_in>0, height_in>0, divisor?:139\|166\|194 (default 166) }` | `{ cubic_inches, divisor, dimensional_weight_lbs }` |
| POST | `/api/calc/boxes` | `{ bedrooms:int 1..10 }` | `{ bedrooms, boxes:{small,medium,large}, total_box_volume_cuft }` |
| POST | `/api/calc/distance-fuel` | `{ origin:{lat,lng}, destination:{lat,lng} }` | `{ great_circle_miles, driving_miles, gallons, fuel_cost_usd, constants:{mpg,fuel_price_usd_per_gal,circuity} }` |
| POST | `/api/calc/quote-anomaly` | `{ quoted_weight_lbs>0, quoted_volume_cuft>0 }` | `{ implied_density, baseline:7.0, lower_bound:5.95, upper_bound:8.05, deviation_pct, is_anomalous, reason }` |
| POST | `/api/calc/estimate` | `{ bedrooms?:'studio'\|'one'\|'two'\|'three'\|'four', total_cuft?:num>0 (exactly one), origin:{lat,lng}\|{zip}, destination:{lat,lng}\|{zip} }` | `{ total_cuft, est_weight_lbs, distance_miles, fuel_cost_usd, cost_low_usd, cost_high_usd, full_service_mid_usd, recommendation:'full_service'\|'diy', recommendation_text, origin:{lat,lng,city?,state?}, destination:{...} }` — **422 `UNRESOLVED_LOCATION`** if a `zip` can't be resolved (surface the message; prompt for a supported metro or lat/lng) |
| GET | `/api/geo/resolve` | `?zip=NNNNN` | `{ found:true, zip, zip3, lat, lng, city, state }` — or 200 `{ found:false, zip }` if the ZIP-3 prefix is unseeded (prompt for a supported metro / lat-lng); 400 malformed zip |
| GET | `/api/catalog/items` | — | `{ items:[{key,label,volume_cuft}], bedroom_presets:{ studio:{cuft,items:[key...]}, one:{...}, two:{...}, three:{...}, four:{...} } }` |

**UI element → endpoint map:** **anonymous hero mini-calculator + the `/move/:slug` pre-filled mini-calc (all tiles AND the verdict badge) → `/api/calc/estimate` (ONE call — never `/api/calc/volume` + `/api/calc/dimensional-weight` + `/api/vault/scenario` + `/api/calc/quote-anomaly` for the anonymous hero);** volume calculator (item picker + "load a 2-bedroom sample") + hero bedroom presets → `/api/catalog/items`; ZIP/city inputs (hero, `/tools/distance`, `/move/:slug`) → `/api/geo/resolve?zip=` (or pass `{zip}` to `/api/calc/estimate` / `/api/calc/distance-fuel` flows, which resolve server-side); volume calculator readouts → `/api/calc/volume`; weight calculator + DIY-vs-LTL bar → `/api/calc/dimensional-weight`; box-count helper → `/api/calc/boxes`; distance page readouts → `/api/calc/distance-fuel`; quote-anomaly badge (vault only) → `/api/calc/quote-anomaly`. Unseeded ZIP prefixes return `found:false` (geo) / 422 (estimate) — never fabricate coordinates.

### FMCSA

| Method | Path | Request | Success (200 → `data`) |
|---|---|---|---|
| GET | `/api/fmcsa/lookup` | `?usdot=<n>` **or** `?mc=<n>` (exactly one) | `{ found:true, carrier_name, usdot, mc, operating_status, authorized_for_hhg:bool, insurance_on_file_usd, meets_750k_minimum:bool, crash_total, inspection_total, plain_english:[strings], source, fetched_at }` — or `{ found:false, reason, source, fetched_at }` — or `502` (render staleness banner) |

**UI:** carrier-check page + landing FMCSA spotlight → this endpoint. Render `plain_english[]` verbatim; gauge stroke color from verdict; render `source` + `fetched_at` in JetBrains Mono. 400 if neither/both params.

### Address / NCOA

| Method | Path | Request | Success (200 → `data`) |
|---|---|---|---|
| POST | `/api/address/standardize` | `{ street, city, state, zip }` | `{ standardized:{street,city,state,zip,zip4?}, provider:'ncoalink'\|'fallback', utility_checklist:[{category,task}] }` |

**UI:** the address/utilities step in the timeline dashboard + a standalone widget on `/dashboard`. Render the standardized address and the `utility_checklist[]` as a checklist.

### Auth & sessions

| Method | Path | Auth | Request | Success → `data` |
|---|---|---|---|---|
| POST | `/api/session/anon` | none | `{}` | 201 `{ session_token, session_id }` |
| POST | `/api/auth/register` | none | `{ email, password (≥8) }` | 201 `{ user_id, auth_token }` |
| POST | `/api/auth/login` | none | `{ email, password }` | 200 `{ user_id, auth_token, is_premium }` |
| POST | `/api/auth/logout` | Bearer | `{}` | 200 `{ revoked:true }` |
| POST | `/api/session/upgrade` | Bearer (anon) | `{ email, password }` | 200 `{ user_id, auth_token, inventory_migrated:int }` |

**UI:** `/join` uses register (or upgrade when an anon session exists); `/login` uses login; header "Sign out" uses logout. On register/login/upgrade, persist `auth_token` and, if returned, `is_premium`. Handle 409 (email exists) and 401 (bad creds) inline.

### Inventory (Bearer — registered OR anon session)

| Method | Path | Request | Success → `data` |
|---|---|---|---|
| POST | `/api/inventory/save` | `{ name, items:[...] }` | 201 `{ id, total_cuft, total_cbm }` (recomputed server-side) |
| GET | `/api/inventory/list` | — | 200 `{ items:[{id,name,total_cuft,total_cbm,updated_at}] }` |
| GET | `/api/inventory/[id]` | — | 200 `{ id,name,items,total_cuft,total_cbm,... }` |
| PUT | `/api/inventory/[id]` | `{ name?, items? }` | 200 `{ id, total_cuft, total_cbm }` |
| DELETE | `/api/inventory/[id]` | — | 200 `{ deleted:true }` |

**UI:** volume tool "Save this inventory"; dashboard inventory list/edit/delete. Anon session tokens may also save (the "save before signup" flow).

### Timeline (Bearer — user)

| Method | Path | Request | Success → `data` |
|---|---|---|---|
| POST | `/api/timeline/generate` | `{ move_date:'YYYY-MM-DD', origin?, destination? }` | 201 `{ id, move_date, tasks:[{week_offset,due_date,category,title,done:false,overdue:bool}] }` |
| GET | `/api/timeline/[id]` | — | 200 timeline object |

**UI:** `/dashboard/timeline`. Reject past dates client-side too (mirror backend), but the backend is the source of truth for the task list and dates.

### Vault (PREMIUM-gated — 402 if not premium)

| Method | Path | Request | Success → `data` |
|---|---|---|---|
| POST | `/api/vault/quotes` | `{ mover_name, mover_usdot?, quoted_price_usd?, quoted_weight_lbs?, quoted_volume_cuft?, extracted_text? }` | 201 `{ id, implied_density, is_anomalous, anomaly_reason }` |
| GET | `/api/vault/quotes` | — | 200 `{ quotes:[...] }` |
| GET | `/api/vault/quotes/[id]` | — | 200 quote |
| PUT | `/api/vault/quotes/[id]` | partial fields | 200 recomputed quote |
| DELETE | `/api/vault/quotes/[id]` | — | 200 `{ deleted:true }` |
| POST | `/api/vault/scenario` | `{ distance_miles>0, labor_hours≥0, weight_lbs>0 }` | 200 `{ scenarios:[{name,line_items:[{label,amount_usd}],total_usd}], ranked:[names cheapest-first] }` |
| POST | `/api/vault/alerts` | `{ timeline_id?, task_title, phone, send_at }` | 201 `{ alert_id, status:'scheduled' }` |
| GET | `/api/vault/alerts` | — | 200 `{ alerts:[{ id, timeline_id, task_title, send_at, status, created_at }] }` |

**UI:** vault dashboard (quotes CRUD), compare page (scenario), alerts page (`GET /api/vault/alerts` lists, `POST /api/vault/alerts` schedules). On **402**, render preview-with-sample-data + unlock button; do NOT treat 402 as a crash.

### Premium purchase (Bearer — user)

| Method | Path | Request | Success → `data` |
|---|---|---|---|
| POST | `/api/premium/purchase` | `{ amount_usd:number in [19.99,29.99] }` (v1 mock payment) | 200 `{ is_premium:true, premium_purchased_at }` |

**UI:** the pricing unlock button + the copper upsell modal. On success, flip local premium state and unlock vault routes. Handle 400 (amount out of range).

### Affiliate & ad config

| Method | Path | Request | Success → `data` |
|---|---|---|---|
| POST | `/api/affiliate/click` | `{ partner:'hireahelper'\|'packaging'\|'utility'\|'truck', context? }` | 200 `{ click_id, redirect_url }` |
| GET | `/api/affiliate/go` | `?partner=&context=` | 302 redirect (logs click) |
| GET | `/api/config/ad-slots` | — | 200 `{ slots:[{id,placement,enabled,size}] }` |

**UI:** affiliate CTAs POST `/api/affiliate/click` then `window.location = redirect_url` (or use `/api/affiliate/go` as a plain `<a href>`). Ad slots: fetch `/api/config/ad-slots` and render/gate each container by its `enabled` flag (Section 6).

### Routes (programmatic, no auth)

| Method | Path | Success → `data` |
|---|---|---|
| GET | `/api/routes/[slug]` | 200 `{ origin, destination, distance_miles, fuel_cost_usd, origin_carrier_count, dest_carrier_count, noindex, noindex_reason }` — 404 unknown slug |

**UI:** `/move/:slug` pages. Honor `noindex` with a robots meta tag.

### Admin (Bearer = `ADMIN_API_KEY` or user with `is_admin=1`)

| Method | Path | Request | Success → `data` |
|---|---|---|---|
| GET | `/api/admin/ingest-health` | `?limit=` | 200 `{ runs:[...] }` |
| GET | `/api/admin/api-usage` | `?from=&to=` | 200 `{ usage:[{provider,day,calls,cost_cents}], totals:{...} }` |
| GET | `/api/admin/noindex-audit` | — | 200 `{ routes:[{id,noindex,noindex_reason,origin_carrier_count,dest_carrier_count}] }` |
| POST | `/api/admin/ingest/trigger` | `{ usdots:[string] }` | 202 `{ ingest_run_id, enqueued:int }` |

**UI:** `/admin/*`. All require the admin bearer; render 401/403 as a bearer-entry gate.

**Client conventions:** a single `apiFetch(path, {method, body, auth})` wrapper that attaches the bearer, parses the `{ok,data,error}` envelope, throws typed errors by code, and is used by every component. Debounce calculator POSTs ~300–500ms. No component fabricates a value the API would return.

---

## 5. Responsive & accessibility

**Mobile-first breakpoints:** design at 360px first, then enhance at `≥480` (`sm`), `≥768` (`md` — the hero un-stacks to 55/45), `≥1024` (`lg`), `≥1280` (`xl`, 1200px content cap). Fluid layout via flexbox/grid, `clamp()` for hero type and section padding, relative units throughout; `max-width:100%` on all media. The page body must never scroll horizontally — wide tables/diagrams live in their own `overflow-x:auto` container.

**Mobile hero reorder (restate):** eyebrow → H1 → subhead → **mini-calculator card FIRST** → CTA → trust strip. Card on solid `#0B1220`; outputs a 3-tile horizontal row; sticky mobile result bar on tool pages respects `env(safe-area-inset-bottom)` and never covers the active input.

**Contrast (WCAG 2.2 AA, non-negotiable):** body/small ≥4.5:1; large (≥24px or ≥18.66px/700) ≥3:1; UI/icons/borders/focus/chart strokes ≥3:1 (1.4.11); aim 7:1 on body where free. **Verify text-over-photo at the worst-case (lightest) pixel under the text, not the average.** White text (`#FFFFFF`/`#EAF1F7`) over the ≥0.72-alpha scrim zone is the safe default; `text-shadow: 0 1px 3px rgba(0,0,0,.5)` is reinforcement only. `--accent-bright`/mint cyan FORBIDDEN as text on light (use `--accent-ink`). `--text-muted` never lighter than `#4A5568`.

**Color never alone (1.4.1):** Authorized/caution/flagged/recommended always carry icon **+** text label ("⚠ Flagged: density 22% above baseline," "Best value") — never a bare colored cell or highlight.

**Focus & keyboard:** `:focus-visible` = 3px `--accent-bright` + 2px offset + ink halo on dark/photo (≥3:1 both sides). Every control keyboard-operable; DOM order = visual order; no positive `tabindex`; skip-link first; steppers respond ↑/↓; the Tools mega-flyout opens on focus, closes on Esc, arrow-traverses, sets `aria-expanded`; modals `role="dialog" aria-modal`, trap focus, Esc closes, focus returns to trigger; `scroll-margin-top:64px` on anchor targets.

**ARIA for the data widgets:**
- **FMCSA report** = `<section aria-labelledby>` + `<dl>` term/value pairs + `<time datetime>` for the timestamp + a polite live region announcing the verdict ("Carrier USDOT 123456 is Authorized, insurance active"); use **assertive** for Not Authorized.
- **Calculator results** = `aria-live="polite" aria-atomic="true"`, debounced ~500ms; announce the settled value only (never every intermediate tick).
- **Tables** (multi-scenario, vault, admin) = real `<table>` + `<caption>` + `<th scope>`; abbreviated currency ("$1.2k") carries a full `aria-label` ("1,240 US dollars").
- **Timeline** = `<ol>` of week `<section>`s with checkbox lists; decorative connector lines `aria-hidden="true"`; progress in `role="status"`.

**Type legibility:** body ≥16px (17–18px long-form), 14px meta-floor only at ≥4.5:1; line-height body 1.6 / headings 1.1–1.25 / tables ≥1.4; measure `max-width:68ch`; caps labels +0.06–0.08em; tabular lining figures on all computed output; reflow to 400% zoom + 200% text-only with no loss; `rem` for all font-size; **`user-scalable=no` is BANNED** (viewport meta must allow zoom).

**Reduced motion (`prefers-reduced-motion: reduce`):** kill parallax, ken-burns, count-up tickers (snap meaningful numbers to final value — never animate the number itself), scroll-jack, marquees, 3D tilt, animated meshes, gauge sweep, spine draw, `layoutId` slide (instant swap). Keep instant color/opacity feedback + focus rings. CSS backstop: `*{animation-duration:.01ms!important; transition-duration:.01ms!important}`. Also honor `prefers-reduced-data`/Save-Data (static hero, no parallax).

**Tap targets:** 44×44px minimum (steppers, toggles, checkboxes, nav, "Verify"), ≥8px spacing; mobile CTAs ≥48px in the thumb zone; inputs `font-size:16px` (no iOS zoom) + appropriate `inputmode` (numeric/decimal); no hover-only affordances.

**A11y ship bar (must pass):** axe-core / Lighthouse a11y **≥95**, zero contrast failures, full keyboard walkthrough of all 4 calculators + FMCSA lookup + timeline, and a VoiceOver/NVDA readout of one calculator result and one FMCSA verdict.

---

## 6. Revenue surfaces

### 6.1 Ad-slot containers — EXACT DOM ids (from backend §7.1)
Fetch `GET /api/config/ad-slots` → `{ slots:[{id,placement,enabled,size}] }`. Render a container **only where its slot is placed**, using the slot `id` as the container's DOM `id`, and gate rendering on `enabled` (a disabled slot still returns; render nothing but keep the layout stable). The four slots:
- `#route_top` — placement `route_page_header`, size `728x90` — top of every `/move/:slug` page.
- `#route_inline` — placement `route_page_body`, size `300x250` — inline in the `/move/:slug` body.
- `#calc_sidebar` — placement `calculator_sidebar`, size `300x600` — tool-page sidebar (ships `enabled:false`; render the reserved space only when enabled).
- `#timeline_footer` — placement `timeline_footer`, size `728x90` — footer of the timeline views.
Ad containers are non-intrusive, clearly bounded, never obscure content, never a pop-up/interstitial, and reserve their fixed dimensions so there is zero CLS.

### 6.2 Affiliate CTA placements (wired to `/api/affiliate/*`)
Each CTA POSTs `/api/affiliate/click` with its `partner` + `context`, then navigates to the returned `redirect_url` (or is a plain `<a href="/api/affiliate/go?partner=…&context=…">`). Partners and placements:
- **`hireahelper`** (labor) — "Book vetted loading/unloading help" in the timeline dashboard packing/moveweek steps and the multi-scenario labor row. `context` = the route slug or `timeline`.
- **`packaging`** (boxes) — "Order the exact boxes you need" inside `/tools/volume` sidebar + the box-count helper. `context` = `box-calculator`.
- **`utility`** (Citizen Home Solutions) — "Transfer your utilities in one call" in the address/utilities timeline step + the standardized-address widget. `context` = `utilities`.
- **`truck`** (DIY truck rental) — "Compare truck rentals" on `/tools/weight` next to the DIY-vs-LTL bar and in the scenario compare view. `context` = the route slug.
Affiliate CTAs are calm text-plus-arrow links or outline buttons, never lime-green shout buttons, and are visually subordinate to the primary utility action on the page.

### 6.3 Premium / Vault upsell + gating (copper)
- The only **copper** surfaces: the landing Vault teaser (§3.1 Section 8), the `/pricing` Pass column, the vault dashboard chrome, and a copper upsell modal. Copper = premium, always. **Price copy is identical on all three surfaces that show it — "$19.99–$29.99 one-time" (no subscription)** — matching the landing Vault teaser, the `/pricing` Pass column, and the copper upsell modal, and matching `POST /api/premium/purchase`'s `amount_usd ∈ [19.99, 29.99]`. Never show a single-value price (e.g. bare "$19.99") on any of these.
- **Gating flow:** vault routes call gated endpoints; a **402 PREMIUM_REQUIRED** response renders the feature **preview populated with clearly-labeled SAMPLE data** (not real, not fabricated-as-real — labeled "Sample") behind a subtle copper scrim, with a **single** unlock CTA → `/pricing` → `POST /api/premium/purchase` (`amount_usd ∈ [19.99,29.99]`, v1 mock). On success, flip premium state and re-fetch real vault data. No dark patterns, no nagging, one unlock button.
- The pricing page shows locked features as previews-with-sample-data + one unlock — mirror this exactly.

---

## 7. Assets & imagery direction

### 7.0 Global philosophy
Photography is the warmth counterweight to the cockpit ink. **It never appears in the hero** (graphic/data-driven only). It carries the human/editorial/trust bands below the fold. **Every image is graded so all photos read as one campaign:** one shared LUT — cool-neutral shadows graded toward `--navy #0B2A4A`, highlights warmed toward ivory `#FAF7F2`, ~15–20% desaturation, subtle 2–3% film grain. **No visible faces selling anything** (hands and environments only). **Banned forever:** smiling-mover stock, red SOLD signs, handshake clip-art, clip-art moving boxes, default icon packs — all read "broker."

**Two mandatory overlay treatments (a11y + signature):**
- **Linear scrim** (text over photo, bottom-left): `linear-gradient(180deg, rgba(11,18,32,0) 0%, rgba(11,18,32,0.35) 45%, rgba(11,18,32,0.82) 100%)`. Text lives in the ≥0.72-alpha zone.
- **Ink→teal duotone** (editorial cards): map photo to `#0B1220 → #14B8A6` duotone so it behaves like a solid; then only standard text-on-solid contrast applies.
- Verify contrast at the worst-case lightest pixel under text. Long-form body copy never sits on a photo.

### 7.1 Hero visual (graphic, no photo)
Dark canvas `#0B1220` + mesh-aurora (§2.7.3) + topographic contour SVG at 5% opacity + ONE animated route-line arc drawing origin→destination across the upper-right negative space + the frosted-glass live mini-calculator card as the proof object. LCP-safe: no opacity-from-0 on any large background asset. This kills the "moving-truck stock photo" broker trap at the most important pixel.

### 7.2 Shot list (10 briefs, below-fold). Each: subject · treatment · placement · AI-gen prompt. Export AVIF + WebP, responsive `srcset`, `loading="lazy"` (except above-fold), blur-up LQIP.
1. **Boxes as geometric still-life** — kraft boxes in a precise grid on ivory seamless, top-light. *Ivory grade, faint teal route-line overlay.* → 4-Tools section header band / volume explainer. *AI:* "overhead and 3/4 studio still life of neatly labeled kraft cardboard moving boxes stacked in a precise grid on an ivory paper seamless, soft north light, minimal, editorial product photography, no people, muted warm tones."
2. **Aerial highway interchange at dusk** — drone top-down, long-exposure light trails, blue hour. *Ink→teal duotone, route-line along one ramp.* → Distance & Fuel / "Orchestrate" step. *Unsplash/Pexels brief:* "aerial top-down highway interchange dusk long exposure light trails." *AI:* "top-down aerial drone photograph of a multi-level highway interchange at blue hour, long-exposure car light trails, deep navy tones, cinematic, no text."
3. **Hands sealing a labeled box** — close crop, two hands taping a box labeled "KITCHEN," warm window light, no face. *Warm-graded, shallow depth.* → How-it-works "Estimate" step / timeline intro. *AI:* "close-up of hands sealing a cardboard moving box labeled KITCHEN with packing tape, warm domestic window light, shallow depth of field, calm, no faces, editorial."
4. **Single truck on open road, big sky** — clean box truck small in frame, vast graded sky, negative space for headline. *Linear scrim bottom, cool-neutral grade.* → full-bleed CTA band divider. *Unsplash/Pexels brief:* "moving box truck open highway wide landscape big sky." *AI:* "wide cinematic landscape, a plain white box truck driving a straight open highway under a vast graded blue-hour sky, lots of empty sky for text, no branding, calm."
5. **LTL freight geometry from above** — top-down palletized freight, repeating rectangles. *Ink→teal duotone.* → Dimensional-Weight explainer. *AI:* "top-down photograph of neatly arranged shipping pallets and freight boxes forming a clean geometric grid, industrial, muted navy-teal duotone, no people."
6. **Modern living room mid-pack** — sunlit minimal room, a few labeled boxes, a tablet showing a route map, no people. *Warm-neutral grade.* → "Registered account / save your work" section. *AI:* "bright modern minimalist living room mid-move, a few neatly labeled boxes, a tablet on the counter showing a map route, warm morning light, calm aspirational interior photography, no people."
7. **Container on a driveway** — PODS-style container on a clean suburban driveway, early light. *Cool grade, route-line accent.* → container comparison. *AI:* "a portable moving storage container placed on a clean suburban driveway at soft morning light, wide, tidy, editorial, no people, muted tones."
8. **Keys + address-change flat-lay** — house keys, USPS change-of-address card, phone with a checklist, on ivory. *Ivory grade.* → Address & Utilities / NCOA section. *AI:* "overhead flat lay on ivory surface: house keys, a change-of-address form, a smartphone showing a checklist app, tidy, warm editorial product photography, no faces."
9. **Night desk / planning scene** — laptop glowing with soft teal, a mug, control-center mood. *Dark grade, teal accent glow.* → dark "How it works / control center" band. *AI:* "calm night desk scene, laptop glowing with soft teal light, coffee mug, minimal, cinematic dark navy tones, focused planning mood, no faces."
10. **Overhead map + tape + notebook** — paper map, measuring tape, notebook with handwritten dimensions. *Ivory grade, contour-line overlay.* → "Why neutral / how the math works" trust manifesto. *AI:* "overhead flat lay of a paper road map, a yellow measuring tape, an open notebook with handwritten box dimensions, ivory background, warm editorial, no people."

**Placeholder guidance (assets not ready):** generate solid `#0B1220`/`#FAF7F2` blocks with the mesh-aurora CSS, OR pull the closest free Unsplash/Pexels match per brief and apply the LUT via a CSS `filter` + duotone overlay layer. NEVER ship raw un-graded stock into a section. All placeholders must still carry the scrim/duotone so text contrast holds.

### 7.3 Data-visualization style
- Palette: teal `--accent` for the primary/"computed"/cheaper-wins series; navy `--navy` for the neutral/comparison series; copper `--copper` for premium/Vault; semantic green/amber/red for verdicts only. Grid keylines ≥3:1.
- **Volume:** faceted box glyph fills translucent teal in real time; secondary readout in tabular Inter.
- **Dimensional-weight:** horizontal DIY-truck vs LTL bars; the cheaper bar recolors teal + "Best value" chip.
- **Multi-scenario:** real `<table>` — column-per-scenario, row-per-cost-driver, highlighted recommended column, bold sticky total row, right-aligned tabular currency; anomaly = inline amber "⚠ Flagged" chip (never a bare red cell).
- **FMCSA safety score:** 0–100 gauge arc with animated sweep; stroke color = verdict.
- All figures `tabular-nums`; abbreviated values carry a full accessible `aria-label`.

### 7.4 Iconography
ONE monoline set: **Lucide** (MIT, tree-shakeable, static-safe). 1.5px stroke, 20/24px grid, round caps/joins to echo the route-line. No filled clip-art, no multicolor packs. Category icons (utilities, USPS, school, vendor) and tool-tile icons all from Lucide. Decorative icons `aria-hidden="true"`; icon-only buttons get `aria-label`.

### 7.5 OG / social image (1200×630)
Dark `#0B1220` + mesh-aurora corner bloom + 5% contours. Left: MovePilot wordmark + Fraunces headline "Real math. No spam." + a small teal "Verified" seal. Right: a stylized route-line arc `● → ◎` + a compact volume/weight/cost readout card. No photo. Provide a per-major-page static PNG variant (landing, tools, carrier-check) each with the page's one-line value prop, wired via `og:image` meta.

### 7.6 Favicon
Route-line mark: a minimal teal `●→◎` arc (or a compact "M" formed by a route-line) on transparent/`#0B1220`. Provide 32/16px PNG, 180px apple-touch, and an SVG mask-icon in `--navy`/`--accent`. Emoji stand-in during build: 🧭 → replace with the SVG mark.

---

## 8. Export constraints

- **Static assets only.** Output must build to static assets deployable on **Cloudflare Pages** — **React + Vite** (SPA with client-side routing) or an equivalent static export. No SSR requirement; no server-only Node APIs (`fs`, `path`, `net`, `http/https`, Node `crypto`, `Buffer`, `process` for secrets, streams). The backend Functions already serve `/api/*` on the same origin — the UI just fetches them.
- **Dependency-lean (paid-token efficiency):**
  - **Motion:** `motion` (Framer's successor) via **`LazyMotion` + `domAnimation`** (~5–6kb features), JS budget ≤40kb. Everything else — hover, press, focus, skeleton shimmer — pure CSS. Scroll reveals via native `IntersectionObserver` (`whileInView`). NO scroll-jacking, NO smooth-scroll library, NO counter library (use `useSpring`+`useTransform` for roll-ups).
  - **Icons:** Lucide (tree-shaken).
  - **Fonts:** self-hosted variable Fraunces / Inter / JetBrains Mono (WOFF2, subset Latin, preloaded, `font-display:swap`). No Google Fonts network request at runtime.
  - **PDF extraction:** `pdfjs-dist` (pdf.js) is the **single sanctioned exception** to the dependency-lean rule — permitted ONLY for client-side PDF text extraction in the Relocation Vault add-quote flow (§3.10). It is lazy-loaded on that route only (not in the main bundle) and its failure degrades gracefully to manual numeric entry. No other UI-kit or utility dependencies beyond this and the motion/icon/font set above.
  - No UI kit bloat; keep the component set hand-built and small.
- **Theme toggle:** dark marketing / light app, persisted to `localStorage`, applied via `data-theme` on `<html>`; both themes fully styled; the viewer's OS `prefers-color-scheme` is the initial signal, the toggle overrides.
- **Zero CLS:** all media `width`/`height` reserved; skeletons match final dimensions; fonts preloaded; no layout-shifting late assets.
- **SPA deep-link fallback (required):** emit a Cloudflare Pages SPA fallback file **`public/_redirects`** containing the single line `/* /index.html 200` so that any client-side route (e.g. `/tools/volume`, `/move/:slug`, `/dashboard/vault`) resolves to the SPA shell on direct load or refresh instead of 404-ing. This rule must NOT shadow the API: Cloudflare Pages Functions under `/api/*` take precedence over the static `_redirects` fallback, so real backend routes are unaffected (do not add a `/api/*` rewrite — leave `/api/*` to the Functions router).
- **Config:** the API base is same-origin (relative `/api/*`). No secrets in the client. Environment-agnostic build (`vite build` → `dist/`).

---

## 9. Motion specification (build all of this)

**Stack:** `motion` via `LazyMotion`+`domAnimation` for scroll reveals, springs, layout, number roll-ups; pure CSS for hover/press/focus/skeletons; native `IntersectionObserver` for reveals. ≤40kb JS. All motion honors `prefers-reduced-motion` (Section 5).

**Motion tokens:**
```css
--ease-out-quart:    cubic-bezier(0.22, 1, 0.36, 1);   /* house curve: entrances, reveals */
--ease-out-expo:     cubic-bezier(0.16, 1, 0.30, 1);   /* hero big reveals */
--ease-in-out-quart: cubic-bezier(0.76, 0, 0.24, 1);   /* repositions, page transitions */
--ease-out-back:     cubic-bezier(0.34, 1.4, 0.64, 1); /* trust-badge/verdict pops ONLY */
--ease-standard:     cubic-bezier(0.4, 0, 0.2, 1);     /* hover micro */
/* durations */ --dur-micro:120ms; --dur-fast:180ms; --dur-base:280ms; --dur-mid:420ms; --dur-slow:680ms; --dur-xslow:900ms;
```
Spring presets: `springSoft {stiffness:170,damping:26,mass:1}` (cards/panels), `springSnappy {320,30}` (press/toggle), `springNumber {90,20,mass:1.1}` (roll-ups — monotonic, never overshoot money/weight).

**Guiding rule:** motion serves clarity and trust, never spectacle. Distances small (8–40px); ease *out* (decelerate into place); one primary motion per moment; supporting elements stagger behind.

**Hero entrance choreography (LCP visible immediately, never opacity-from-0):**
| t (ms) | element | motion |
|---|---|---|
| 0 | nav | opacity + `translateY(-8→0)` 280ms |
| 120 | eyebrow | opacity + `translateY(16→0)` 420ms |
| 200 | H1 | opacity + `translateY(24→0)` 560ms `--ease-out-expo`, optional 40ms/word stagger |
| 340 | subhead | opacity + `translateY(20→0)` 480ms |
| 460 | CTA row | opacity + `translateY(16→0)` + `scale(0.96→1)` 420ms |
| 560 | trust strip | opacity + `translateY(12→0)` 400ms |
| 620 | mini-calc card | opacity + `translateY(28→0) scale(0.98→1)` 620ms `springSoft` |
Mesh/route-line background: slow settle only. Scroll-cue chevron loops 0→6px (1800ms), fades after 200px scroll.

**Scroll reveals:** `whileInView`, `viewport={{once:true, margin:"0px 0px -15% 0px"}}` (fires at 85% vh). Default: `opacity 0→1` + `translateY(32→0)` 420ms `--ease-out-quart`; children stagger 70ms (cap 8). Split rows: photo slides `translateX(±24→0)`, text 60ms after. Parallax on hero + 1–2 photo bands only, background `translateY` at 0.12× scroll (max ±40px), transform-only, off on touch + reduced-motion.

**Signature moments:**
1. **Number roll-ups** — every result figure springs to target (`springNumber`, 600–800ms, monotonic, tabular-nums, no width jitter). On change: micro-flash `--text → --accent → --text` + `scale(1→1.04→1)` 400ms. First calc counts from 0 over 900ms with a teal progress underline sweeping `scaleX 0→1` (transform-origin left). Under reduced-motion, snap to the final value instantly (never animate the meaningful number).
2. **FMCSA gauge-sweep verdict** — scan state: ring appears, sweep arc rotates 360° (900ms) with 3 pulsing skeleton check-lines. Resolve: `stroke-dashoffset` fills to score (680ms), stroke interpolates to verdict color; central label pops `scale(0.7→1)` 420ms `--ease-out-back` (the one intentional overshoot — **Authorized only**; Not-Authorized uses `--ease-out-quart`, never playful); check-lines resolve top→down 140ms stagger with check-draw + green row wash; timestamp fades in last. Pair with the verified-seal ping (§2.7.5).
3. **Timeline spine draw** — spine draws top→bottom `scaleY 0→1` (transform-origin top) 900ms; nodes pop `scale(0→1)` `--ease-out-back` synced ~110ms as the line passes; task cards slide `translateX(16→0)` 60ms after their node; the "next critical" item breathes a soft mint ring (2s loop — the only persistent loop besides the scroll cue).
4. **`layoutId` sliding tab pill** — scenario tabs (DIY / Container / Full-service) and segmented controls slide the active pill (280ms `springSnappy`) rather than cutting.

**Hover/press (CSS):** primary button hover `translateY(-2px)` + shadow `sm→md` + 6% lighten (140ms), trailing arrow nudges `translateX(3px)`, active `scale(0.97)`. Cards hover `translateY(-4px)` + `--e2→--e3` + inner image `scale(1.04)` in `overflow:hidden` frame. Links: pseudo-element underline `scaleX 0→1` from left. Optional cursor-follow sheen via CSS `--mx/--my` (rAF-throttled, skip on touch).

**Loading:** skeletons over spinners everywhere; shimmer = `linear-gradient` highlight translating `-100%→200%`, 1400ms, transform/background-position only, gated behind 200ms. Blur-up LQIP for all photos (`filter blur(20px)→0` + opacity crossfade 400ms on `decode()`). SPA route transitions: out `opacity+translateY(0→-8px)` 180ms, in `opacity+translateY(8→0)` 260ms.

**Performance rules:** animate **only `transform`/`opacity`** (filter sparingly for blur-up); never width/height/top/left/margin/box-shadow-size on hot paths. `will-change` only on in-flight elements. `content-visibility:auto` below fold. Reveal elements sit at their final layout position → **CLS = 0**. Target 60fps on mid-tier mobile, <4ms/frame.

---

## 10. Definition of done checklist

**First-Impression Scorecard — the hero must pass 8/8:**
1. **5-second gist** — a new visitor can state "it calculates my moving cost and checks if movers are safe, privately" within 5s, from headline + visible live calculator alone.
2. **Anti-broker signal unmistakable** — "no email/phone" AND "don't sell your data/leads" both visible without scrolling.
3. **Interactive proof above the fold** — a real input produces a real (fetched) number on the first screen; not a static image or a "Get Started" dead-end.
4. **One obvious primary action** — exactly one high-contrast primary CTA; eye lands on it in <2s; never the word "Quotes."
5. **Trust-by-authority visible** — the FMCSA / federal-data credibility line reads as real, above the fold, not a badge farm.
6. **Calm & premium, not cluttered** — ≤1 primary + 1 secondary CTA, ≤3 trust badges, no pop-ups/carousels/fake logos on first paint.
7. **Legible over imagery** — every hero text element ≥4.5:1 against its scrim in both themes; H1 fully readable at a glance.
8. **Fast & stable** — LCP <2.0s on 4G, zero CLS in hero, skeletons never spinners, calculator responds within one frame of input.
> Any fail on #2, #3, or #4 = the hero has reverted to looking like a lead broker and must be reworked.

**Accessibility ship bar:** axe-core / Lighthouse a11y **≥95**; zero contrast failures; full keyboard walkthrough of all 4 calculators + FMCSA lookup + timeline; VoiceOver/NVDA readout of one calculator result and one FMCSA verdict.

**Build checklist:**
- [ ] Every page in Section 3 built, with loading (skeleton) / empty / error / success states for every data-driven component.
- [ ] The Split-Proof Hero built exactly to §3.1-HERO; passes the 8/8 scorecard.
- [ ] Every button, readout, and table wired to a **real endpoint** from Section 4; **zero mock/hardcoded data** anywhere in the final output; unreachable-backend renders documented loading/error states, never fabricated numbers.
- [ ] Both themes (dark marketing / light app) fully styled; persistent toggle; all tokens from Section 2 transcribed exactly.
- [ ] All six signature motifs + the full motion spec (Section 9) implemented; CLS = 0; transform/opacity only; reduced-motion honored.
- [ ] Responsive mobile-first at 360/480/768/1024/1280; mobile hero reorder (calculator-first); no horizontal body scroll.
- [ ] Revenue surfaces present with the exact DOM ids `#route_top`, `#route_inline`, `#calc_sidebar`, `#timeline_footer` (gated on `enabled`); affiliate CTAs wired to `/api/affiliate/*`; copper Vault upsell + 402 preview-with-sample-data gating.
- [ ] Lucide icons only; self-hosted variable fonts; OG images + favicon per Section 7.
- [ ] Accessibility ship bar met (≥95, keyboard, ARIA data widgets, contrast incl. worst-pixel-over-photo).
- [ ] Builds to static assets (`vite build` → `dist/`) deployable on Cloudflare Pages; no server-only Node APIs; motion ≤40kb.
- [ ] Backend logic never recreated: no client-side formulas, constants, parsers, or data — the UI only fetches, formats, and displays.

*Deliver the complete UI in this single generation. Do not ask questions.*
