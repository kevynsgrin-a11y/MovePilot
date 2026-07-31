# MovePilot

> **The privacy-first relocation control center.** MovePilot gives interstate and complex movers mathematically grounded volume, weight, and cost estimates plus FMCSA carrier verification — without ever selling their contact data to lead brokers.

*Brand working title:* **MovePilot**. Alternatives under consideration pending USPTO trademark verification (research §19): **MoveMetrics**, **TransitTrust**, **RelocateOS**, **FreightGuard**, **LogisticsLedger**.

---

## The concept

MovePilot is a deterministic **orchestration utility** for residential and commercial relocations — not a moving broker and categorically not a lead-generation farm. Users enter an origin, destination, and itemized household inventory to receive transparent, mathematically grounded estimates of cubic volume, dimensional weight, and logistical requirements. That structured data drives a week-by-week timeline (vendor quotes, utility transfers, address changes, school-enrollment deadlines) and an integrated FMCSA safety-verification tool that translates opaque federal regulatory data into plain-English trust signals.

The defensible wedge: **escrowed identity**. Every core calculator, safety lookup, and checklist works fully anonymously — no phone number, no email — proving value before asking for any commitment. This positions MovePilot directly against the low-trust, spam-heavy incumbents that dominate moving search today.

### Target users (research §6)

| Segment | Primary job-to-be-done | Priority |
|---|---|---|
| **Interstate Migrators** | Avoid catastrophic financial/emotional risk of fraudulent carriers; forecast cost across labor, long-haul transit, and storage; verify FMCSA interstate authority. | **Primary — MVP target** |
| **Corporate / SMB Relocations** | Orchestrate timelines to minimize downtime; maximize lump-sum stipend efficiency; run multi-scenario cost comparisons and normalized quote vaulting. | Secondary |
| **Complex Family Movers** | Reduce cognitive load of multi-stage moves (home sale, temp housing, phased storage); centralize utility transfers, USPS changes, school deadlines. | Tertiary (highest ancillary-affiliate potential) |

Explicitly excluded: student moves and hyper-local single-bedroom transfers — extreme price sensitivity, negligible lifetime value.

---

## Competitor landscape — and how MovePilot wins

The market is saturated with lead brokers, affiliate farms, and closed-ecosystem providers, leaving a distinct gap for an independent, privacy-first orchestration layer (research §7).

| Rival | Their model | Their weakness | How MovePilot beats them |
|---|---|---|---|
| **MoveBuddha** | Programmatic SEO | Revenue inextricably tied to partnered movers; UI reads as heavily monetized. | Offers a genuinely **neutral, un-partnered** calculation layer that does not broker the user, capturing the affiliate-skeptical segment while matching their programmatic route footprint. |
| **Moving.com** | Lead generation | Sells user data to multiple carriers instantly → spam calls within minutes; zero retention. | **Refuses to sell data.** Escrowed identity and double-blind routing eliminate the spam loop entirely, positioning MovePilot as consumer advocate. |
| **U-Haul** | Direct DIY provider | Dense legacy UI; assumes the DIY decision is already made; no objective comparison tools. | Intercepts users earlier with **dimensional-weight calculators** that objectively prove whether DIY-truck or LTL freight is cheaper for their specific inventory. |
| **PODS** | Direct container provider | Closed ecosystem; no objective comparison with full-service movers or rival containers. | **Volume-to-container math** normalizes PODS pricing against FMCSA-authorized full-service carriers, giving neutral logistical clarity. |
| **HireAHelper** | Labor marketplace | Scope-limited to labor; user still self-orchestrates truck, route, and timeline. | Integrates their **developer API** inside a holistic timeline, capturing value across the whole move lifecycle while earning labor commissions. |
| **Move.org** | Content / affiliate | Affiliate farm; lacks deep interactive planning utilities. | Ships **interactive, proprietary calculators** (volume, dimensional weight, quote normalization) that editorial-only sites cannot match. |
| **Angi** | Lead generation | Same lead-distribution spam flaws as Moving.com; no FMCSA specialization. | Privacy-first routing plus **FMCSA-native carrier verification** neither of which Angi provides. |
| **Thumbtack** | Lead generation | Leads sold to local providers; high privacy friction. | Double-blind bidding — carriers see inventory/distance/dates, **never contact info** until the user explicitly accepts. |

---

## v1 feature list & acceptance criteria (research §11)

### Free MVP Utility (anonymous, top-of-funnel)
- **Instant move estimate** — *From a home size (or volume) and a ZIP→ZIP lane, returns a composite estimate — cubic volume, shipping weight, distance, fuel, a rough full-service cost range, and DIY-vs-full-service guidance — with no login. Powers the landing hero.*
- **Distance & fuel estimator** — *Given an origin and destination, returns route distance and a theoretical fuel-cost estimate with no login.*
- **Inventory-to-volume calculator** — *Maps household items to standard box sizes (1.5 / 3.0 / 4.5 cu ft) and returns total cubic feet and CBM.*
- **Dimensional-weight estimator** — *Returns theoretical shipping weight from L×W×H using the 166 cu-in/lb divisor for DIY-vs-LTL comparison.*
- **FMCSA USDOT/MC lookup** — *Given a USDOT or MC number, returns a plain-English safety report (authorized status, $750k insurance) with a last-queried timestamp.*

### Registered Account (Free — adds persistence & orchestration)
- **Saved inventory state** — *A logged-in user's calculator inputs persist across sessions with no data loss from the anonymous session.*
- **Timeline orchestration graph** — *Generates a week-by-week deadline checklist counting down to the move date.*
- **NCOALink address standardization** — *Validates/standardizes a new address and produces a utility-transfer + change-of-address checklist.*

### Premium Project Pass (Paid — $19.99–$29.99, one-time → "Relocation Vault")
- **Relocation Vault** — *Stores the normalized numeric fields (price / weight / volume / implied density) of each mover estimate in D1; raw PDF bytes are never persisted — PDF text extraction happens client-side.*
- **Quote normalization & anomaly detection** — *Normalizes weight-based vs volume-based quotes to a common density and flags any quote whose implied density deviates >15% from the 7.0 lb/cu ft baseline.*
- **Multi-scenario financial modeling** — *Displays DIY-truck vs hybrid-container vs full-service costs side by side.*
- **SMS deadline alerts** — *Sends automated SMS reminders for critical-path timeline items.*

### Admin Console (internal)
- **Ingestion health dashboard** — *Surfaces FMCSA data-ingestion status and parsing error rates in real time.*
- **API cost/rate monitor** — *Tracks third-party API rate limits and per-record NCOALink spend.*
- **SEO suppression audit** — *Lists programmatic routes auto-tagged `noindex` for insufficient proprietary data and allows manual override.*

---

## Revenue plan (research §14)

**Phase 1 — Ads + contextual affiliates (launch)**
- **Programmatic display ads** — non-intrusive placements on high-traffic city-pair route pages (modeled RPM $8 → $22 as authority grows).
- **Affiliate / partner integrations** — HireAHelper API for booked loading/unloading labor; packaging-supplier links inside the box calculator; utility-transfer/setup partners (e.g., Citizen Home Solutions) earning commission when users transition utilities through the timeline dashboard.

**Phase 2 — Premium Project Pass** — one-time **$19.99–$29.99** unlock (no recurring subscription — aligned with the infrequency of moving). **Gating:** the Relocation Vault, quote-normalization anomaly detection, multi-scenario modeling, and SMS alerts are locked behind the pass; all Free MVP and Registered-Free features remain fully open.

**Phase 3 — Validated lead generation (strictly controlled, post-scale)** — once organic volume is achieved, high-intent leads are forwarded **exclusively** to carriers the internal FMCSA parser confirms as "Authorized" with active insurance. Unlike incumbents, a lead is never sold to multiple brokers, and identity is masked until the user accepts a bid. Carriers pay a premium for algorithmically verified, low-acquisition-cost consumers.

---

## Tech stack (research §15)

Cloudflare-native, serverless, low-latency:

- **Cloudflare Pages** — application shell + statically generated programmatic city-pair pages.
- **Cloudflare Pages Functions (Workers runtime)** — dynamic API logic: calculation engines (dimensional weight, volume), FMCSA parsing, address standardization (Lob/Smarty/Melissa), HireAHelper labor rates. *No Node-only APIs.*
- **Cloudflare D1** (serverless SQLite) — user accounts, saved inventory states, timeline data.
- **Cloudflare KV** — high-speed cache for static lookups (item volumes, dimensional divisors) and cached FMCSA safety records to survive rate limits.
- **Cloudflare Queues + a companion Worker** — because Pages Functions cannot host queue consumers or cron, a small **companion Worker** (separate deploy, same repo) runs the FMCSA SAFER refresh queue consumer and two Cron Triggers: a weekly SAFER re-ingest and a 15-minute scan that dispatches due SMS deadline alerts recorded in D1.

> **Storage decision:** MovePilot provisions **no R2** in v1. The Relocation Vault stores only the *normalized numeric fields* of each mover estimate in D1 — raw PDF binaries are never persisted; PDF text extraction happens client-side. SMS deadline alerts are timed as D1 rows scanned by cron (Cloudflare Queues can't hold a message until a days-away send time).

Projected infra cost stays under ~$50/mo at 10k sessions, ~$150 at 100k, and under ~$1,200 at 1M sessions.

---

## Pipeline status

This repo is produced by the Site Factory pipeline. **Stage 1 (Concept) is complete pending approval.** See **[PIPELINE.md](./PIPELINE.md)** for the live, authoritative status table across all stages.

---

## API Reference

All endpoints are Cloudflare Pages Functions under `/api/*` (Workers runtime). Full request/response/error schemas live in [`docs/prompts/backend-build-prompt.md`](docs/prompts/backend-build-prompt.md) §5 & §12. Auth via `Authorization: Bearer <token>`; premium endpoints return **402** when the user isn't premium.

**Calculators & estimate — no auth**

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/calc/estimate` | Composite anonymous move estimate: volume, weight, distance, fuel, cost range, recommendation |
| POST | `/api/calc/volume` | Inventory → total cu ft + CBM |
| POST | `/api/calc/dimensional-weight` | L×W×H → dimensional weight (÷166/139/194) |
| POST | `/api/calc/boxes` | Bedrooms → small/medium/large box counts |
| POST | `/api/calc/distance-fuel` | Origin/dest lat-lng → driving miles + fuel cost |
| POST | `/api/calc/quote-anomaly` | Weight + volume → implied density + anomaly flag |

**Geo, catalog, carrier, address & routes — no auth**

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/geo/resolve?zip=` | ZIP → lat/lng/city/state (seeded ZIP-3 centroids) |
| GET | `/api/catalog/items` | Named-item catalog + bedroom presets |
| GET | `/api/fmcsa/lookup?usdot=\|mc=` | Plain-English FMCSA safety report + source/fetched_at |
| POST | `/api/address/standardize` | Standardized address + utility-transfer checklist |
| GET | `/api/routes/[slug]` | City-pair: origin/dest coords, distance, fuel, carrier counts, noindex |
| GET | `/api/config/ad-slots` | Ad-slot config |

**Auth & sessions**

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/session/anon` | Create anonymous session token |
| POST | `/api/auth/register` · `/api/auth/login` · `/api/auth/logout` | Register / login / revoke |
| POST | `/api/session/upgrade` | Anon → registered, preserving inventory (zero loss) |

**Inventory & timeline — Bearer**

| Method | Path | Purpose |
|---|---|---|
| POST/GET | `/api/inventory/save` · `/api/inventory/list` | Save / list inventory states |
| GET/PUT/DELETE | `/api/inventory/[id]` | Load / update / delete a state |
| POST/GET | `/api/timeline/generate` · `/api/timeline/[id]` | Generate / fetch a week-by-week timeline |

**Relocation Vault & premium — Bearer premium (402 if not)**

| Method | Path | Purpose |
|---|---|---|
| POST/GET | `/api/vault/quotes` | Create / list normalized mover quotes |
| GET/PUT/DELETE | `/api/vault/quotes/[id]` | Load / update / delete a quote |
| POST | `/api/vault/scenario` | Multi-scenario cost model (DIY / container / full-service) |
| POST/GET | `/api/vault/alerts` | Schedule / list SMS deadline alerts |
| POST | `/api/premium/purchase` | One-time Project Pass ($19.99–$29.99) → `is_premium` |

**Affiliate & admin**

| Method | Path | Purpose |
|---|---|---|
| POST/GET | `/api/affiliate/click` · `/api/affiliate/go` | Log click → tracked redirect |
| GET | `/api/admin/ingest-health` · `/api/admin/api-usage` · `/api/admin/noindex-audit` | (admin) Ops dashboards |
| POST | `/api/admin/ingest/trigger` | (admin) Enqueue an FMCSA re-ingest batch |

> Background/scheduled work — the FMCSA queue consumer, the weekly SAFER re-ingest cron, and the 15-minute SMS-dispatch cron — runs in the **companion Worker** (`worker/`), not in Pages Functions.

## Public domain deployment

The full Cloudflare-native application is published at
[`https://relocationstation.app`](https://relocationstation.app) through the
Cloudflare Worker in [`cloudflare/`](cloudflare/). Cloudflare manages the apex
and `www` DNS records and TLS certificates; `www` redirects permanently to the
apex. The edge also supplies SPA fallback for direct client-side route visits.

The upstream `movepilot.pages.dev` deployment includes the Vite frontend and
Pages Functions. Production D1, KV, and Queue bindings power the documented API;
the separate companion Worker owns the Queue consumer and cron schedules.

## Local dev & deploy quickstart

```bash
# Install dependencies
npm install

# Local dev (Cloudflare Pages + Pages Functions)
npm run preview   # wrangler pages dev — serves Pages + Functions with D1/KV bindings

# Deploy to Cloudflare Pages
npm run deploy    # wrangler pages deploy
```

Bindings for `D1` (accounts, inventory, timeline), `KV` (FMCSA cache, static lookups), and the `MP_FMCSA_INGEST` queue **producer** are configured in the Pages `wrangler.toml`; the **companion Worker** (`worker/wrangler.toml`) holds the queue **consumer** and the cron triggers, and is deployed alongside Pages. Third-party credentials (NCOALink provider, HireAHelper, SMS) are supplied as Pages/Worker secrets, never committed.
