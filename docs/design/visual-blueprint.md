# MovePilot — Visual & Design Blueprint

**Version:** 1.0 (integrated) · **Owner:** Art Direction · **Status:** Production-ready, drives the v0/Lovable/Bolt build prompt
**Runtime constraint:** everything here builds to static assets on Cloudflare Pages (React/Vite). Self-hosted fonts, CSS/SVG gradients, one small motion library. No runtime services required for the visual layer.

This document reconciles six specialist deliverables (market research, brand system, UX/IA, first-impression hero, accessibility, motion) into one opinionated source of truth. Where specialists conflicted, the resolution is stated inline under **DECISION**.

---

## 0. Conflict resolutions (read first)

| Conflict | Options on the table | DECISION |
|---|---|---|
| **Dark canvas hex** | `#0B1220` (market/first/a11y) vs `#071522` / `#0B2A4A` (brand) | **`#0B1220`** is the single dark canvas. It is the 3-way consensus and a11y-verified at 15.8:1 for white text. `#0B2A4A` becomes `--navy` (brand-primary ink for light theme). `#071522` is retired. |
| **Accent color** | teal `#2DD4BF` / `#12B5A6` / bright `#38E0C8` | **`--accent = #14B8A6`** (verified teal) as the ink-safe system value; **`--accent-bright = #3FE0CF`** for glows/strokes/focus on dark only; **`--accent-ink = #0E8F7E`** for teal-as-text on light surfaces. Bright cyan is BANNED as text on paper (fails AA at ~1.4:1). |
| **Standalone CTA blue** | first-impression proposed `#1466F0` primary button | **REJECTED.** A 4th hue breaks the "ink + one accent + one warm" discipline every other specialist and the market data demand. Primary CTA is **navy fill on light / teal fill on dark**. No blue anywhere. |
| **Display typeface** | Inter-everywhere (market) vs Fraunces serif (brand) vs Geist/General Sans (first) | **Fraunces (display) + Inter (UI/body) + JetBrains Mono (raw IDs/timestamps).** The characterful serif is the decisive differentiator from both dev-tool clones AND spammy broker sites; Inter carries all UI and tabular numerals. |
| **Hero background** | full-bleed photo + scrim (first) vs graphic mesh/cockpit (brand) | **Graphic hero, no photo.** Dark cockpit mesh-aurora + topographic contours + animated route-line arc, with a live frosted-glass mini-calculator as the proof object. Photography carries the human/editorial bands BELOW the fold. This kills the "moving-truck stock photo" broker trap at the most important pixel. |
| **Default theme** | dark (brand/market) vs light readability (a11y/app) | **Marketing pages default DARK ("cockpit"); the logged-in app/tools default LIGHT ("ivory").** Persistent toggle everywhere. |

---

## 1. Art-Direction Statement + Mood

**MovePilot is a precision flight instrument for your move.** The interface behaves like the calm, near-black cockpit of a modern aircraft: a deep ink canvas, one confident teal "verified" signal that glows only when something is proven true, warm copper reserved for the premium tier, and crisp cartographic route-lines that turn the chaos of relocation into a single readable path from origin to destination. Every number is tabular and settles into place without bouncing; every trust signal earns its color. The system is engineered as the exact visual opposite of a lead-broker site — no lime-green "GET FREE QUOTES" energy, no smiling-mover stock, no rainbow of competing buttons. Instead: instrument-panel restraint, generous negative space, editorial warmth from a soft-modern serif, and a live calculator as the hero so a first-time visitor sees real math working before they read a word of marketing.

**Mood words:** calm · precise · trustworthy · aviation-instrument · editorial · engineered · un-spammy · quietly premium.
**Anti-mood (never):** urgent · salesy · cluttered · clip-art · carnival · corporate-clinical · "template."

---

## 2. Final Design System (tokens)

### 2.1 Color tokens

All tokens are CSS custom properties. Two themes: `:root` (light "ivory", app default) and `[data-theme="dark"]` (cockpit, marketing default). Values below are the reconciled, a11y-verified set.

**Core brand (theme-independent identity):**
```
--navy:            #0B2A4A   /* brand ink — logo, headings on light, primary btn fill (light) */
--navy-600:        #123A63   /* hover on navy */
--navy-900:        #061826   /* deepest ink */
--accent:          #14B8A6   /* VERIFIED teal — the one signal color (system value) */
--accent-bright:   #3FE0CF   /* glows, route-lines, focus ring, strokes on DARK only */
--accent-ink:      #0E8F7E   /* teal-as-TEXT/links on light surfaces (AA-safe 4.6:1) */
--copper:          #B7793F   /* PREMIUM / Relocation Vault only — never generic CTAs */
--copper-tint:     #F4E7D6   /* copper wash backgrounds (light) */
```

**Light theme (`:root`) — "Ivory", app + long-session reading:**
```
--bg:              #FAF7F2   /* warm ivory page bg (NOT sterile white) */
--surface:         #FFFFFF   /* cards, inputs */
--surface-raised:  #FFFDFA   /* modals, popovers */
--surface-sunk:    #F0EBE3   /* hover rows, subtle wells */
--border:          #E4DDD2   /* hairlines */
--border-strong:   #C9C0B4   /* input borders */
--text:            #12202E   /* primary text (15.5:1 on ivory) */
--text-muted:      #4A5568   /* secondary text — a11y floor, 7.0:1, NOT lighter */
--text-faint:      #6E665B   /* captions/meta only, ≥4.5:1 */
--success:         #1E7A54   /* Authorized — always + icon + label */
--warn:            #B0740F   /* caution / >15% density anomaly — + icon + label */
--danger:          #C0392B   /* Not Authorized / insurance lapse — + icon + label */
```

**Dark theme (`[data-theme="dark"]`) — "Cockpit", marketing + hero:**
```
--bg:              #0B1220   /* deep ink canvas (consensus, 15.8:1 white text) */
--surface:         #0F1A2C   /* cards */
--surface-raised:  #13233A   /* modals/popovers */
--surface-sunk:    #0A0F1A   /* deepest well */
--border:          #1D2B40   /* hairlines on dark */
--border-strong:   #2E4462   /* input borders */
--text:            #EAF1F7   /* primary text on ink */
--text-muted:      #A6B6C9   /* secondary (≥4.5:1 on --bg) */
--text-faint:      #8193A8   /* meta only */
--navy:            #4FA3E0   /* navy brightens → sky-blue for legibility on dark */
--accent:          #2FD3C1   /* teal signal on dark */
--success:         #4ADE9E
--warn:            #F0B24A
--danger:          #FF6B5E
```

**Semantic usage rules (enforce downstream):**
- **One accent = one meaning.** Teal is only ever "verified / active / computed / route." Never decorative.
- **Copper is Vault-only.** If copper appears, it means premium/paid.
- **Semantic color never travels alone.** Authorized/caution/flagged always carry icon **+** text label (WCAG 1.4.1).
- **Bright cyan/mint (`#3FE0CF`, `#2FD3C1`) is FORBIDDEN as text on light.** Strokes, focus rings, glows, and dark-surface text only.

### 2.2 Typography

Self-hosted variable fonts (Google Fonts origins, subset to Latin, `font-display: swap`, preloaded). All buildable static.

| Role | Family | Fallback stack |
|---|---|---|
| Display / headings | **Fraunces** (opsz variable, low SOFT/WONK) | `"Fraunces", Georgia, "Times New Roman", serif` |
| UI / body / numbers | **Inter** (variable) | `"Inter", system-ui, -apple-system, "Segoe UI", sans-serif` |
| Raw data (USDOT/MC, timestamps) | **JetBrains Mono** | `"JetBrains Mono", ui-monospace, "SF Mono", monospace` |

- Numerals everywhere a figure appears: `font-variant-numeric: tabular-nums; font-feature-settings: "tnum" 1, "lnum" 1;` — mandatory on every calculator readout, cost table, weight/volume/CBM figure, and timeline date so digits don't jitter as values roll.
- Fraunces axes: `opsz` high on large headings, `wght` 400–600, keep SOFT/WONK low-medium (confident financial/aviation-publication tone, not fashion-editorial).

**Type scale (1rem = 16px base, ~1.25 major-third; use `rem`, never `px`, for font-size):**

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
| `data-hero` | 2.5–3.5rem | Inter tnum | 600 | 1.00 | −0.01em |
| `data-raw` | 0.875–1rem | JetBrains Mono | 400 | 1.4 | 0 |

- **Display clamps responsive:** hero H1 `clamp(2.75rem, 6vw, 4.5rem)`.
- **Prose measure:** `max-width: 68ch` (never full-bleed paragraphs). Body base never below 16px; 14px floor is meta-only at ≥4.5:1.
- **Overlines** ("VERIFIED CARRIER", "STEP 3 OF 8", "8 WEEKS OUT") uppercase, +0.08em, in `--accent-ink` (light) / `--accent` (dark) or `--text-faint`.
- Body weight ≥400 on light, ≥500 on dark. No 300/light for reading text or anything over imagery.

### 2.3 Spacing scale (4px base)

`--space-*`: `0, 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128` (px).
- Section vertical rhythm: **96–128px desktop / 56–72px mobile.**
- Card interior padding: **24–32px.**
- Content max-width: **1200px** centered gutter; wide tables/diagrams scroll inside their own `overflow-x:auto` container (page body never scrolls horizontally).
- 8px baseline grid governs vertical rhythm; generous whitespace is a load-bearing brand signal (anti-clutter).

### 2.4 Corner radii

```
--r-xs: 4px    /* chips, tags */
--r-sm: 8px    /* inputs, small buttons */
--r-md: 12px   /* buttons, list rows */
--r-lg: 16px   /* cards */
--r-xl: 24px   /* calculator shells, feature panels */
--r-2xl: 32px  /* hero media, modals */
--r-pill: 999px /* trust badges, filter chips, primary CTA */
```
No 0px corners (feels legacy/cold like U-Haul); no blob-round (feels toy). Slightly-rounded = friendly-but-precise.

### 2.5 Elevation (navy-tinted, never neutral-gray)

```
--e1: 0 1px 2px rgba(11,42,74,.06), 0 1px 3px rgba(11,42,74,.08);   /* inputs, chips */
--e2: 0 4px 12px rgba(11,42,74,.08), 0 2px 4px rgba(11,42,74,.06);  /* cards */
--e3: 0 12px 32px rgba(11,42,74,.12), 0 4px 8px rgba(11,42,74,.06); /* popovers, hovered cards */
--e4: 0 24px 64px rgba(6,24,38,.18);                                 /* modals */
--glow-accent: 0 0 0 1px rgba(20,184,166,.4), 0 0 24px rgba(63,224,207,.25); /* verified/active lift */
```
Dark mode: shadows deepen to `rgba(0,0,0,.5)` and rely on `--glow-accent` for lift.

### 2.6 Borders & focus

- Hairline **1px `--border`**; inputs **1.5px `--border-strong`**.
- **Focus ring (designed brand element, `:focus-visible` only):** `outline: 3px solid var(--accent-bright); outline-offset: 2px; border-radius: 6px;` plus, on dark/photo surfaces, an ink halo `box-shadow: 0 0 0 5px rgba(11,18,32,.9)` so the ring clears ≥3:1 on any background. Never `outline:none` without an equal-or-greater replacement.
- Vault/premium cards: 1px **copper gradient border** (masked `linear-gradient`).
- Emphasis dividers may use the **dotted route-line** motif (`stroke-dasharray: 2 8`) instead of a solid rule.

### 2.7 Signature motifs (the "pop")

1. **The Route-Line** — the hero motif. A single continuous **teal→copper gradient stroke** (2px, rounded caps) tracing an arced great-circle path between origin `●` and destination `◎`. Appears animated across the hero, as section dividers, as the timeline spine, and as a 4–7% opacity SVG watermark behind cards. Dashed animated variant for "in progress."
2. **Topographic / cartographic contour lines** — very-low-opacity (4–7%) SVG contour or lat/long grid behind dark hero and section backgrounds. Signals maps/geography/precision without literal Google-Maps clutter.
3. **Mesh-gradient aurora** — soft blurred multi-stop mesh in the hero: `#0B1220 → #0B2A4A → teal bloom (#14B8A6 @ ~20%)` in one corner, `copper (#B7793F) bloom` opposite. Ship as a pre-rendered static AVIF/WebP OR stacked CSS radial-gradients (both static-safe).
4. **Faceted volume glyph** — isometric wireframe cube/box representing cubic-volume; used as loading/empty state and as the volume calculator's live fill (box fills with translucent teal as cu-ft accrue).
5. **Verified-seal ping** — a shield/pill with an animated concentric ping ring in `--accent` when an FMCSA record resolves as Authorized. The emotional payoff moment.
6. **Instrument tick-marks & gauges** — tick-mark rulers on sliders, a 0–100 gauge arc on the safety score, monospaced live timestamps ("Last queried 2026-07-19 14:32 UTC") reinforcing "real, live, mathematical."

---

## 3. Imagery & Photography Direction (the single most important section)

### 3.0 Global philosophy

Photography is the **warmth counterweight** to the cockpit's ink. It never appears in the hero (that stays graphic/data-driven). It carries the human, editorial, and trust bands below the fold. **Every image is treated so all photos read as one campaign** — one shared LUT: cool-neutral shadows graded toward `--navy #0B2A4A`, highlights warmed toward ivory `#FAF7F2`, ~15–20% desaturation, subtle 2–3% film grain. **No visible faces selling you anything** (privacy tone; hands and environments only). **Banned forever:** smiling-mover stock, red SOLD signs, handshake clip-art, clip-art moving boxes, generic default icon packs — all read "broker."

**Two mandatory overlay treatments** (a11y-driven, also the graphic signature):
- **Linear scrim** (text over photo, bottom-left): `linear-gradient(180deg, rgba(11,18,32,0) 0%, rgba(11,18,32,0.35) 45%, rgba(11,18,32,0.82) 100%)`. Text lives in the ≥0.72-alpha zone.
- **Ink→teal duotone** (editorial cards): map photo to `#0B1220 → #14B8A6` duotone so it behaves like a solid; then only standard text-on-solid contrast applies.
- Verify contrast at the **worst-case (lightest) pixel** under any text, not the average. White text (`#FFFFFF`/`#EAF1F7`) over the ≥0.72 scrim is the safe default. `text-shadow: 0 1px 3px rgba(0,0,0,.5)` is reinforcement only — the scrim alone must already pass 4.5:1. Long-form body copy never sits on a photo.

### 3.1 Hero visual (exact spec)

**No photograph.** The hero is a **graphic cockpit composition**:
- **Background:** dark canvas `#0B1220` + mesh-aurora (§2.7.3) + topographic contour SVG at 5% opacity + a single **animated route-line arc** drawing origin→destination across the upper-right negative space.
- **Proof object:** a **frosted-glass live mini-calculator card** (`background: rgba(11,18,32,0.72); backdrop-filter: blur(16px) saturate(120%);` 1px `rgba(255,255,255,0.12)` inner hairline, `--r-2xl`, `--e4`) floating in the right column. This is the LCP-adjacent hero element and the entire "make the math the hero" thesis (see §5).
- Result: the most important pixel shows real, moving math on an instrument canvas — impossible to mistake for a lead farm.

### 3.2 Shot list (10 briefs — below-fold sections)

Each brief: **subject · composition · grade/treatment · placement · source guidance.** Sources: Unsplash/Pexels briefs (free, self-hostable) or AI-gen (Midjourney/Flux) prompt. All exported AVIF + WebP, responsive `srcset`, `loading="lazy"` (except any above-fold), blur-up LQIP.

1. **Boxes as geometric still-life** — neatly labeled kraft moving boxes stacked in a clean modular grid on an ivory seamless sweep, top-light, long soft shadows. *Treatment:* ivory grade, faint teal route-line overlay bottom-right. *Where:* "4 Tools" section header band / volume-calculator explainer. *AI prompt:* "overhead and 3/4 studio still life of neatly labeled kraft cardboard moving boxes stacked in a precise grid on an ivory paper seamless, soft north light, minimal, editorial product photography, no people, muted warm tones."

2. **Aerial highway interchange at dusk** — drone-top-down of a multi-level freeway interchange, long-exposure light trails, blue hour. *Treatment:* ink→teal duotone, route-line traced along one ramp. *Where:* Distance & Fuel section / "Orchestrate" step. *Unsplash brief:* "aerial top-down highway interchange dusk long exposure light trails." *AI prompt:* "top-down aerial drone photograph of a multi-level highway interchange at blue hour, long-exposure car light trails, deep navy tones, cinematic, no text."

3. **Hands sealing a labeled box** — close crop of two hands running packing tape across a box labeled "KITCHEN," warm window light, no face. *Treatment:* warm-graded, shallow depth. *Where:* "How it works — Estimate" step / timeline intro. *AI prompt:* "close-up of hands sealing a cardboard moving box labeled KITCHEN with packing tape, warm domestic window light, shallow depth of field, calm, no faces, editorial."

4. **Single truck on open road, wide with sky** — a clean box truck small in frame on an open highway, vast graded sky, lots of negative space for headline overlay. *Treatment:* linear scrim bottom, cool-neutral grade. *Where:* full-bleed CTA band divider. *Unsplash brief:* "moving box truck open highway wide landscape big sky." *AI prompt:* "wide cinematic landscape, a plain white box truck driving a straight open highway under a vast graded blue-hour sky, lots of empty sky for text, no branding, calm."

5. **LTL freight geometry from above** — top-down of palletized/containerized freight, clean repeating rectangles. *Treatment:* ink→teal duotone. *Where:* Dimensional-Weight explainer (DIY-vs-LTL). *AI prompt:* "top-down photograph of neatly arranged shipping pallets and freight boxes forming a clean geometric grid, industrial, muted navy-teal duotone, no people."

6. **Modern living room mid-pack** — sunlit minimal living room with a few labeled boxes and a tablet on the counter showing a route map; aspirational, organized, no people. *Treatment:* warm-neutral grade, natural light. *Where:* "Registered account / save your work" persistence section. *AI prompt:* "bright modern minimalist living room mid-move, a few neatly labeled boxes, a tablet on the counter showing a map route, warm morning light, calm aspirational interior photography, no people."

7. **Container being placed on a driveway** — a hybrid moving container (PODS-style) set on a clean suburban driveway, early light. *Treatment:* cool grade, route-line accent. *Where:* multi-scenario / container comparison. *AI prompt:* "a portable moving storage container placed on a clean suburban driveway at soft morning light, wide, tidy, editorial, no people, muted tones."

8. **Keys + address change paperwork flat-lay** — overhead flat-lay of house keys, a USPS change-of-address card, a phone showing a checklist, on ivory. *Treatment:* ivory grade. *Where:* Address & Utilities / NCOALink section. *AI prompt:* "overhead flat lay on ivory surface: house keys, a change-of-address form, a smartphone showing a checklist app, tidy, warm editorial product photography, no faces."

9. **Night desk / planning scene** — a calm desk at night with a laptop glowing, a mug, soft teal screen-glow; the "control center" mood. *Treatment:* dark grade, teal accent glow. *Where:* dark-theme "How it works / control center" band. *AI prompt:* "calm night desk scene, laptop glowing with soft teal light, coffee mug, minimal, cinematic dark navy tones, focused planning mood, no faces."

10. **Overhead map + measuring tape + notebook** — cartographic flat-lay: a paper map, a measuring tape, a notebook with handwritten dimensions. *Treatment:* ivory grade, contour-line overlay. *Where:* "Why neutral / how the math works" trust manifesto. *AI prompt:* "overhead flat lay of a paper road map, a yellow measuring tape, an open notebook with handwritten box dimensions, ivory background, warm editorial, no people."

> **Placeholder guidance for the build:** if final assets aren't ready, generate solid `#0B1220`/`#FAF7F2` blocks with the mesh-aurora CSS OR pull the closest Unsplash match per brief and apply the LUT via a CSS `filter` + duotone overlay layer. Never ship raw un-graded stock into a section.

### 3.3 Data-visualization style

- **Palette:** teal `--accent` for the primary/"computed"/cheaper-wins series; navy `--navy` for the neutral/comparison series; copper `--copper` for premium/Vault; semantic green/amber/red for verdicts only. Grid keylines ≥3:1 (1.4.11).
- **Volume:** faceted box glyph fills with translucent teal in real time; secondary readout in tabular Inter.
- **Dimensional-weight:** horizontal **DIY-truck vs LTL comparison bars**; the cheaper bar recolors teal and gets a "Best value" chip.
- **Multi-scenario:** real `<table>` — column-per-scenario, row-per-cost-driver, highlighted recommended column, bold sticky total row, right-aligned tabular currency; anomaly = inline amber "⚠ Flagged" chip on the row (never a bare red cell).
- **FMCSA safety score:** 0–100 **gauge arc** with animated sweep; stroke color = verdict.
- All figures `tabular-nums`; abbreviated values ("$1.2k") carry an accessible full `aria-label` ("1,240 US dollars").

### 3.4 Iconography

- **One monoline set:** Lucide (MIT, tree-shakeable, static-safe). 1.5px stroke, 20/24px grid, round caps/joins to echo the route-line. No filled clip-art, no multicolor icon packs.
- Category icons for timeline (utilities, USPS, school, vendor) and tool tiles drawn from the same set. Decorative icons `aria-hidden="true"`; icon-only buttons get `aria-label`.

### 3.5 OG / social share image (1200×630)

Dark `#0B1220` canvas + mesh-aurora corner bloom + topographic contours at 5%. Left: MovePilot wordmark + Fraunces headline "Real math. No spam." + a small teal "Verified" seal. Right: a stylized route-line arc `● → ◎` with a compact volume/weight/cost readout card. No photo. Export static PNG per major page (landing, tools, carrier-check) with the page's own one-line value prop.

### 3.6 Favicon

Route-line mark: a minimal teal `●→◎` arc, or a compact "M" formed by a route-line, on transparent/`#0B1220`. Provide 32/16px PNG, 180px apple-touch, and an SVG mask-icon in `--navy`/`--accent`. Emoji stand-in during build: 🧭 (compass) → replace with the SVG mark.

---

## 4. Page-by-Page Visual Direction (full IA)

Global chrome (all pages): sticky 64px header, translucent-on-scroll (`backdrop-filter: blur(12px)`, `--bg` at 72% alpha). Left: MovePilot wordmark. Center/left nav (max 5): **Tools** (mega-flyout 2×2) · **Timeline** · **Verify a Carrier** · **Pricing** · **How It Works**. Right: quiet "Sign in" text link + one solid primary button **"Start a move — free"** → `/tools` (NOT `/join` — the CTA leads to value, the single choice that reads "utility, not lead farm"). Footer: 4-column dark (`#0B1220`) — Tools · Product · **Trust** (prominent: Privacy Promise, "We never sell your data," FMCSA source + last-refresh) · Company/Routes; closing strip: "MovePilot is not a moving broker or lead-generation service."

### 4.1 Landing `/` (marketing dark theme) — section-by-section

1. **Hero (above fold)** — cockpit graphic + live mini-calculator (full spec §5). Purpose: identity + differentiation + interactive proof + one action in <5s.
2. **Live tool teaser** — immediately below hero, no scroll gap. The embedded mini-calc from the hero expands / a second working calculator. Frosted card on `#0B1220`. *Reveal:* card rises 28px + `springSoft`. Highest-converting section — build first.
3. **4 Tools bento grid** — 2×2 desktop / stacked mobile, `--r-lg` tiles, one tile enlarged (flagship = Inventory-to-Volume). Each: monoline icon, name (h4), one-line JTBD, "Try it →". Faceted-volume glyph watermark on the flagship. Stagger reveal left→right 70ms. Photo brief #1 as the section header band.
4. **Anti-lead-broker manifesto** — emotional core, dark band with contour watermark. "Every other site sells your number in 90 seconds. We built the opposite." Three proof points (escrowed identity · double-blind routing · FMCSA-verified) as icon+label rows. Photo brief #10 duotone optional.
5. **How it works — 3 steps** — Estimate → Verify → Orchestrate, horizontal numbered flow on the route-line. Overlines "STEP 1/2/3". Photo briefs #3, #9 as step vignettes.
6. **FMCSA verification spotlight** — a real plain-English safety-report card mockup with the gauge arc + green verdict chip + monospaced "Last queried" timestamp. The hardest-to-fake feature; give it a full-width feature panel `--r-xl`.
7. **Timeline preview** — vertical route-line spine with week nodes; "8 WEEKS OUT" overlines; draws top→bottom on scroll. Sells the free-account persistence upgrade.
8. **Premium / Relocation Vault teaser** — copper-accented panel (copper gradient border), quote-normalization + anomaly visual, "$19.99 one-time — no subscription." The only copper on the page.
9. **Popular routes (programmatic SEO)** — quiet grid of city-pair links, hairline-bordered chips, no imagery.
10. **Final CTA band** — full-bleed photo brief #4 (truck, open road, big sky) with linear scrim; repeat "Calculate my move — free" + "No account needed. We never sell your data."
11. **Footer** (global).

*Ordering principle: show → tell → reassure → ask. Registration is never requested on the landing page — only after a tool produces a result.*

### 4.2 `/tools` (Calculators Hub) — light "ivory" or dark, matches marketing dark
Switchboard: the 4 calculators as equal-weight `--r-lg` cards on a 1200px grid, generous whitespace, each with its live-preview thumbnail. One primary CTA per card. Instrument-panel framing.

### 4.3 Tool pages `/tools/volume`, `/tools/weight`, `/tools/distance`, `/tools/carrier-check`
Two-column `--r-xl` "instrument panel" shell: inputs left, live readout dashboard right. Big tabular `data-hero` readouts count-up on change (from-0 only on first calc). Sliders get tick-mark rulers. Volume = faceted box filling teal. Weight = DIY-vs-LTL bars. Carrier-check = the gauge + verdict + `<dl>` federal record + monospaced USDOT/timestamp; three distinct states (Authorized/caution/not-authorized) each icon+color+label. Mobile: sticky bottom action bar within thumb reach; result renders above it. All four ship empty/loading/error states (skeletons, not spinners; sample "here's a 2-bedroom" empty states; FMCSA staleness banner on upstream failure).

### 4.4 `/timeline` (preview) & `/dashboard/timeline`
Vertical route-line spine (teal→copper dashed gradient) down the left; each week a node `●`. Past = solid teal filled node; current = pulsing accent-glow node; future = hollow node on dashed line. Cards clip to the spine with week overline, category icon, checkbox that fills teal with a check-draw. Completing an item advances the spine fill. Semantic `<ol>` of weeks; progress in `role="status"`.

### 4.5 `/move/:origin-to-:destination` (programmatic city-pair)
Landing-lite: reuse hero structure with the lane pre-filled in the mini-calculator; route-line arc drawn origin→destination with city labels; the 4 tools pre-seeded; popular-routes cross-links. `noindex` variants (thin data) still render the generic pre-filled calculator, never a dead end.

### 4.6 `/pricing`
Light ivory, calm. Free vs Project Pass two-column; the Pass column uses the copper gradient border + `--copper-tint` header band. "$19.99–$29.99 one-time — no subscription" prominent. No dark-pattern upsell; locked features shown as previews with sample data + a single unlock button.

### 4.7 `/how-it-works`, `/trust` (Privacy Promise)
Editorial long-form, ivory, 68ch measure, Fraunces headings. The trust manifesto: escrowed identity, double-blind routing, FMCSA-native, "we never sell your data." Photo briefs #9, #10. This is load-bearing — top-nav item + footer column, not a footnote.

### 4.8 `/guides/*`, `/about`, `/legal/*`
Ivory editorial template, 68ch measure, generous rhythm, contour-line section dividers. Standard trust/compliance tone.

### 4.9 `/join`, `/login`, `/verify`, `/reset`
Framed as "Save your work," never "Sign up to see results." Split layout: left = a calm cockpit panel with the route-line + a one-line reassurance ("No spam, ever. We never sell your info."), right = the form on `--surface`. Minimal fields, magic-link option.

### 4.10 `/dashboard` + registered/premium routes (light "ivory" app)
App shell: light ivory canvas for long-session readability, persistent left/top nav, cards `--r-lg` `--e2`. `/dashboard` = active move summary + saved inventory + timeline progress. `/dashboard/vault` (premium) = copper-accented, normalized-quote table + anomaly detection (amber flag chips). `/dashboard/vault/compare` = the multi-scenario table. `/dashboard/alerts` = SMS config. `/dashboard/settings` = includes prominent "delete my data" (privacy proof point).

### 4.11 `/admin/*` (internal)
Utility-grade, dense, ivory, tabular everything. Ingestion-health status tiles (green/amber/red + label), API cost/rate meters, SEO-suppression audit table with override toggles. No marketing polish; readability + density first.

---

## 5. Above-the-Fold Hero Spec (final)

**Named layout: "Split-Proof Hero"** — asymmetric 55/45, left copy / right live tool. Desktop 12-col grid; hero height `100svh − 64px` header, min-height 640px. Dark cockpit theme.

**Left column (cols 1–6, ~55%, left-aligned, padding `clamp(24px,6vw,96px)`):**
- **Eyebrow chip:** overline "PRIVACY-FIRST RELOCATION" in teal.
- **H1 (Fraunces 500, `clamp(2.75rem,6vw,4.5rem)`, lh 1.02, ls −0.02em):**
  > **Plan your move on real math, not a hundred spam calls.**
  Optional kinetic word-swap on "spam calls" ⇄ "sales calls" ⇄ "lead brokers" (fast, subtle, first 500ms only; static under reduced-motion).
- **Subhead (Inter 400, body-lg, `--text-muted` on dark):**
  > MovePilot calculates your exact cubic volume, shipping weight, and cost from your own inventory — and verifies any carrier against federal FMCSA safety records. No phone. No email. No lead brokers.
- **CTA row (exactly one primary):**
  - **Primary:** `Calculate my move — free` — teal `--accent` fill, ink text, `--r-pill`, 52px tall, `--e2`; hover `translateY(-2px)` + shadow bloom. (On light pages this same CTA is navy-filled; on this dark hero it is teal so it clears contrast against ink.) Never "Get Quotes."
  - **Secondary:** `Verify a carrier` — ghost, 1.5px `rgba(255,255,255,0.28)` border, white text. Opens FMCSA lookup (doubles as a second trust proof).
  - **Micro-line under row (12–13px `--text-faint`):** `No account needed. We never sell your data.`
- **Trust strip (below CTA, 3 compact badges, 13px, monoline icons):** 🔒 `No email or phone required` · 🛡️ `FMCSA safety-verified data` · 🚫 `We don't sell leads — ever`. Thin credibility line beneath: `Powered by federal FMCSA SAFER records · updated weekly`.

**Right column (cols 7–12, ~45%): the live mini-calculator card** (frosted glass, §3.1):
- Title: `Instant estimate — no signup`.
- Inputs, prefilled so a real number shows on first paint: segmented control `Studio · 1BR · 2BR · 3BR · 4BR+` (default 2BR); `From ZIP → To ZIP` (default `10001 → 30301`).
- Live output tiles (200ms count-up, tabular-nums, fixed dimensions = zero CLS): `~840 cu ft` · `~5,900 lb` · `~$3,400–$4,600`, plus a one-line verdict badge: `Full-service likely cheaper than a DIY truck for this load`.
- Footer link: `See the full breakdown →` (routes to full calculator, carrying anonymous state, no data loss).

**Background:** `#0B1220` + mesh-aurora + 5% topographic contours + one animated route-line arc (upper-right). No photo. LCP-safe: no opacity-from-0 on any large background asset.

**Mobile (<768px):** stack single column, order: eyebrow → H1 → subhead → **mini-calculator card FIRST** (proof before scroll) → CTA → trust strip. Card on solid `#0B1220` (no photo band). Inputs full-width; outputs a 3-tile horizontal row.

**AVOID above the fold:** fake "As seen in" logos, fake star counts, carousels, pop-ups, a third button. Any social proof must be a single honest, instrumented metric.

---

## 6. Motion Spec

**Stack (static-safe, ≤40kb JS budget):** `motion` (Framer's successor) via `LazyMotion` + `domAnimation` (~5–6kb features) for scroll reveals, springs, layout, number roll-ups (`useSpring`+`useTransform`, no counter lib). Everything else — hover, press, focus, skeletons — **pure CSS**. Scroll via native `IntersectionObserver` (motion `whileInView`); **no scroll-jacking, no smooth-scroll library.**

**Motion tokens (CSS custom props + JS const):**
```
--ease-out-quart:    cubic-bezier(0.22, 1, 0.36, 1)     /* house curve: entrances, reveals */
--ease-out-expo:     cubic-bezier(0.16, 1, 0.30, 1)     /* hero big reveals */
--ease-in-out-quart: cubic-bezier(0.76, 0, 0.24, 1)     /* repositions, page transitions */
--ease-out-back:     cubic-bezier(0.34, 1.4, 0.64, 1)   /* trust-badge/verdict pops ONLY */
--ease-standard:     cubic-bezier(0.4, 0, 0.2, 1)       /* hover micro */
--dur-micro:120ms  --dur-fast:180ms  --dur-base:280ms  --dur-mid:420ms  --dur-slow:680ms  --dur-xslow:900ms
```
Spring presets: `springSoft {stiffness:170,damping:26,mass:1}` (cards/panels), `springSnappy {320,30}` (press/toggle), `springNumber {90,20,mass:1.1}` (roll-ups, monotonic — never overshoot money/weight).

**Guiding rule:** motion serves clarity and trust, never spectacle. Distances small (8–40px), things ease *out* (decelerate into place). One primary motion per moment; supporting elements stagger behind.

**Hero entrance choreography** (photo/LCP visible immediately, never opacity-from-0):
| t (ms) | element | motion |
|---|---|---|
| 0 | nav | opacity + `translateY(-8→0)` 280ms |
| 120 | eyebrow | opacity + `translateY(16→0)` 420ms |
| 200 | H1 | opacity + `translateY(24→0)` 560ms `--ease-out-expo`, optional 40ms/word stagger |
| 340 | subhead | opacity + `translateY(20→0)` 480ms |
| 460 | CTA row | opacity + `translateY(16→0)` + `scale(0.96→1)` 420ms |
| 560 | trust strip | opacity + `translateY(12→0)` 400ms |
| 620 | mini-calc card | opacity + `translateY(28→0) scale(0.98→1)` 620ms `springSoft` |
Mesh/route-line background: slow settle only. Scroll cue chevron loops 0→6px (1800ms), fades after 200px scroll.

**Scroll reveals:** `whileInView`, `viewport={{once:true, margin:"0px 0px -15% 0px"}}` (fires at 85% vh). Default: `opacity 0→1` + `translateY(32→0)` 420ms `--ease-out-quart`, children stagger 70ms (cap 8). Split rows: photo slides `translateX(±24→0)`, text 60ms after. Parallax: hero + 1–2 photo bands only, background `translateY` at 0.12× scroll (max ±40px), transform-only, off on touch + reduced-motion.

**Signature moments:**
1. **Number roll-ups** — every result figure springs to target (`springNumber`, 600–800ms, monotonic, tabular-nums, no width jitter). On change: micro-flash `--text → --accent → --text` + `scale(1→1.04→1)` 400ms. First calc counts from 0 over 900ms with a teal progress underline sweeping `scaleX 0→1` (transform-origin left).
2. **FMCSA gauge-sweep verdict** — scan state: ring appears, sweep arc rotates 360° (900ms) with 3 pulsing skeleton check-lines. Resolve: `stroke-dashoffset` fills to score (680ms), stroke interpolates to verdict color; central label pops `scale(0.7→1)` 420ms `--ease-out-back` (the one intentional overshoot — Authorized only; not-authorized uses `--ease-out-quart`, never playful); check-lines resolve top→down 140ms stagger with check-draw + green row wash; timestamp fades in last.
3. **Timeline spine** — draws top→bottom `scaleY 0→1` (transform-origin top) 900ms; nodes pop `scale(0→1)` `--ease-out-back` synced ~110ms as the line passes; task cards slide `translateX(16→0)` 60ms after their node; "next critical" item breathes a soft mint ring (2s loop — the only persistent loop besides the scroll cue).
4. **`layoutId` sliding tab pill** — scenario tabs (DIY / Container / Full-service) slide the active pill (280ms `springSnappy`) rather than cutting.

**Hover/press (CSS):** primary button hover `translateY(-2px)` + shadow `sm→md` + 6% lighten (140ms), trailing arrow nudges `translateX(3px)`, active `scale(0.97)`. Cards hover `translateY(-4px)` + `--e2→--e3` + inner image `scale(1.04)` in `overflow:hidden` frame. Links: pseudo-element underline `scaleX 0→1` from left. Optional cursor-follow sheen via CSS `--mx/--my` (rAF-throttled, skip on touch).

**Loading:** skeletons over spinners everywhere; shimmer = `linear-gradient` highlight translating `-100%→200%`, 1400ms, transform/background-position only, gated behind 200ms (no flash). Blur-up LQIP for all photos (`filter blur(20px)→0` + opacity crossfade 400ms on `decode()`). SPA route transitions: out `opacity+translateY(0→-8px)` 180ms, in `opacity+translateY(8→0)` 260ms.

**Performance:** animate **only `transform`/`opacity`** (filter sparingly for blur-up); never width/height/top/left/margin/box-shadow-size on hot paths. `will-change` only on in-flight elements. `content-visibility:auto` below fold. Reveal elements sit at final layout position → CLS = 0. Target 60fps mid-tier mobile, <4ms/frame.

---

## 7. Accessibility Guardrails (hard constraints)

**Contrast (WCAG 2.2 AA, non-negotiable):** body/small ≥4.5:1; large (≥24px or ≥18.66px/700) ≥3:1; UI/icons/borders/focus/chart strokes ≥3:1 (1.4.11); aim body 7:1 where free. Verify text-over-photo at the **worst-case lightest pixel**, not the average. **`--accent-bright`/mint cyan FORBIDDEN as text on light** (~1.4:1) — strokes/focus/dark-surface only; use `--accent-ink #0E8F7E` for teal text/links on ivory. `--text-muted` never lighter than `#4A5568` (7:1).

**Color never alone (1.4.1):** Authorized/caution/flagged/recommended always carry icon **+** text label ("⚠ Flagged: density 22% above baseline," "Best value"), never a bare colored cell or highlight.

**Type legibility:** body ≥16px (17–18px long-form), 14px meta-floor only at ≥4.5:1; line-height body 1.6 / headings 1.1–1.25 / tables ≥1.4; measure 60–75ch (`max-width:68ch`); caps labels +0.06–0.08em; body weight ≥400 light / ≥500 dark, never 300. Tabular lining figures on all computed output. Reflow to 400% zoom + 200% text-only with no loss; `rem` for all font-size; `user-scalable=no` BANNED.

**Focus & keyboard:** `:focus-visible` 3px `--accent-bright` + 2px offset, ink halo on dark/photo (≥3:1 both sides). Every control keyboard-operable in DOM order = visual order; no positive `tabindex`; skip-link first ("Skip to calculator/main"); steppers respond ↑/↓; menus open on focus, close on Esc, arrow-traverse, `aria-expanded`; modals trap focus, Esc closes, focus returns, `role="dialog" aria-modal`; `scroll-margin-top` = header height so sticky header never hides focus.

**ARIA for data widgets:** FMCSA report = `<section aria-labelledby>` + `<dl>` term/value + `<time datetime>` + polite live region announcing the verdict ("Carrier USDOT 123456 is Authorized, insurance active"; assertive for Not Authorized). Calculator results = `aria-live="polite" aria-atomic` debounced ~500ms, announce settled value only. Tables = real `<table>` + `<caption>` + `<th scope>`, abbreviated currency carries full `aria-label`. Timeline = `<ol>` of week `<section>`s with checkbox lists, decorative connector lines `aria-hidden`, progress in `role="status"`. One `<header>/<nav aria-label>/<main>/<footer>` per page.

**Reduced motion (`prefers-reduced-motion: reduce`):** kill parallax, ken-burns, count-up tickers (snap to final value — never animate the meaningful number), scroll-jack, marquees, 3D tilt, animated meshes, gauge sweep, spine draw, `layoutId` slide (instant swap). Keep instant color/opacity feedback + focus rings. CSS backstop: `*{animation-duration:.01ms!important; transition-duration:.01ms!important}`. Also honor `prefers-reduced-data`/Save-Data (static hero, no parallax).

**Tap targets:** 44×44px min (steppers, toggles, checkboxes, nav, "Verify"), ≥8px spacing; mobile CTAs ≥48px in thumb zone; inputs `font-size:16px` (no iOS zoom) + `inputmode` numeric/decimal; no hover-only affordances; sticky mobile result bar respects `env(safe-area-inset-bottom)` and never covers the active input.

**Verification gate (ship bar):** axe-core / Lighthouse a11y ≥95, zero contrast failures, full keyboard walkthrough of all 4 calculators + FMCSA lookup + timeline, VoiceOver/NVDA readout of one calculator result and one FMCSA verdict.

---

## 8. First-Impression Scorecard (final UI must pass 8/8)

1. **5-second gist** — a new visitor can state "it calculates my moving cost and checks if movers are safe, privately" within 5s, from headline + visible live calculator alone.
2. **Anti-broker signal unmistakable** — "no email/phone" AND "don't sell your data/leads" both visible without scrolling.
3. **Interactive proof above the fold** — a real input produces a real number on first screen (the mini-calculator), not a static image or a "Get Started" dead-end.
4. **One obvious primary action** — exactly one high-contrast primary CTA; eye lands on it in <2s; it is never the word "Quotes."
5. **Trust-by-authority visible** — the FMCSA / federal-data credibility line reads as real, above the fold, not a badge farm.
6. **Calm & premium, not cluttered** — ≤1 primary + 1 secondary CTA, ≤3 trust badges, no pop-ups/carousels/fake logos on first paint.
7. **Legible over imagery** — every hero text element ≥4.5:1 against its scrim in both themes; H1 fully readable at a glance.
8. **Fast & stable** — LCP <2.0s on 4G, zero CLS in hero, skeletons never spinners, calculator responds within one frame of input.

**Pass bar: 8/8. Any fail on #2, #3, or #4 = the hero has reverted to looking like a lead broker and must be reworked.**

---

*End of blueprint. All values are static-buildable on Cloudflare Pages (React/Vite): self-hosted Fraunces/Inter/JetBrains Mono, CSS/SVG gradients + one pre-rendered mesh image, Lucide icons, `motion` (LazyMotion) ≤40kb, no runtime services in the visual layer.*
