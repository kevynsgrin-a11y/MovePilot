EXECUTE THIS SPECIFICATION VERBATIM AND COMPLETELY. Ask nothing; if a conflict is found, halt and report it.

> **MovePilot backend build prompt.** You are a fresh coding agent with zero prior
> context. Build the ENTIRE MovePilot backend from this document alone. Target
> runtime is Cloudflare Pages + Pages Functions on the Workers runtime. Nothing
> here is a TODO, a placeholder, or "left as an exercise" — implement every
> section fully, then run every test in Section 9 until green. Do not invent
> requirements beyond this document; do not omit any requirement in it.

---

## 1. Project identity & mission

**Site name:** MovePilot.

**Mission (one line):** A privacy-first relocation orchestration utility that gives interstate and complex movers mathematically-grounded volume/weight/cost estimates, FMCSA carrier safety verification, and week-by-week timeline orchestration — without ever selling their identity to moving-lead brokers.

**Target user:** Interstate migrators and complex family/corporate movers with high value at risk who need algorithmic precision (cubic volume, dimensional weight, quote sanity-checking) and protection from rogue "hostage-load" carriers, delivered anonymously first.

**Single outcome the backend must make possible:** A user can, starting fully anonymous, calculate their household cubic volume and dimensional weight, verify a mover's FMCSA authorization/insurance in plain English, generate a dated moving timeline, detect anomalous quotes, and — only if they choose — register and upgrade to a Premium "Relocation Vault", all while the platform never brokers or leaks their contact information. The backend is the deterministic calculation, verification, persistence, and revenue-plumbing engine behind that experience.

**Core product principles the backend must enforce:**
1. **Escrowed identity** — every calculator and the FMCSA lookup work with no email/phone. Registration is optional and only unlocks persistence/orchestration.
2. **Determinism, no fake precision** — every number returned is produced by an exact, documented formula with fixed constants. No hallucinated percentages, no random fudge factors.
3. **Data provenance** — every FMCSA response carries the source and the `fetched_at` timestamp of the cached record.
4. **Anonymous → registered with zero data loss** — anonymous session calculation state must be upgradable into a registered account.

---

## 2. Target runtime constraints

- **Platform:** Cloudflare Pages with Pages Functions. All server code lives under `functions/` using Pages' file-based routing (`functions/api/foo.js` → `/api/foo`; `functions/api/foo/[id].js` → `/api/foo/:id`). The repo MUST remain `npx wrangler pages dev`-runnable and Cloudflare-Pages-deployable at every commit.
- **Runtime:** Cloudflare Workers runtime ONLY. **No Node-only APIs.** Specifically forbidden: `fs`, `path`, `net`, `http`/`https` modules, Node `crypto` module, Node `Buffer`, `process.env` for secrets, `__dirname`, streams from `node:stream`, `require()`. Use Web-standard equivalents only:
  - Hashing / random / HMAC → **Web Crypto** (`crypto.subtle`, `crypto.getRandomValues`, `crypto.randomUUID`).
  - HTTP calls → global **`fetch`**.
  - Base64 → `atob`/`btoa` or `Uint8Array` manual encode (no `Buffer`).
  - Env/bindings → the Pages Functions `context.env` object (D1, KV, Queue bindings, and secrets are all on `env`).
  - Time → `Date.now()` / `new Date().toISOString()`.
- **Language:** JavaScript (ES modules, `.js`). No TypeScript compilation step, no bundler required beyond what Wrangler provides. All shared logic in plain ESM modules importable by both Functions and tests.

**Storage decisions (per research §15) — each with justification:**

| Need | Store | Why this store |
|---|---|---|
| User accounts, anonymous sessions, saved inventory states, timelines, vault quotes, affiliate click log, ingest log, API-usage meter, SMS alert records, programmatic route rows | **D1 (serverless SQLite)** | Relational, needs joins (users↔sessions↔inventory↔timelines↔vault), transactional integrity for the anon→registered upgrade, and structured querying for the admin console. This is core mutable relational state. |
| Cached FMCSA SAFER carrier records; static item-volume table; dimensional-weight divisors; box-size constants; ad-slot config | **KV (edge key-value)** | Read-heavy, low-write, latency-critical lookups served globally. FMCSA records are cached weekly to avoid IP bans / rate limits and must be readable at the edge without a D1 round-trip. The static constant tables (item volumes, divisors, box sizes) are read on nearly every calculator call and never change intra-deploy — KV keeps them hot and edge-local. |
| FMCSA SAFER refresh jobs (fan-out of USDOT numbers to a consumer that refreshes KV) | **Queues** (`MP_FMCSA_INGEST`) | Background work that must not block request latency and needs retry semantics. The **producer** binding exists on BOTH the Pages project (for the admin trigger) and the companion Worker (for its weekly cron enqueue); the **consumer** runs only in the companion Worker (see below), because Pages Functions cannot host `queue()` consumers. |

**R2 is NOT provisioned in v1.** Consequence for the Relocation Vault: MovePilot stores the **normalized numeric fields** of each mover estimate (and optional extracted plain text) in D1; it does **not** persist raw PDF binaries. PDF text extraction happens client-side (frontend) and the extracted numbers are POSTed to the vault endpoints. This is a deliberate scope decision consistent with the D1/KV/Queues-only storage mandate — document it in the README.

**Background & scheduled work run in a companion Worker — NOT in Pages Functions.** Cloudflare Pages Functions support ONLY HTTP handlers (`onRequest`); they cannot host `queue()` consumers or `scheduled()` (cron) handlers. This project therefore ships **two deploy targets in one repo**:
1. **The Pages project** (`functions/` + static assets) — all HTTP API plus the Queue **producer** binding `MP_FMCSA_INGEST`.
2. **A companion Worker** (`worker/`, its own `worker/wrangler.toml`) that binds the SAME D1 (`MP_DB`) and KV (`MP_KV`), declares BOTH a Queue **producer** and **consumer** binding for `MP_FMCSA_INGEST` (producer so its weekly cron can `.send()` the re-ingest batch; consumer to process the messages), and declares **Cron Triggers**. Its `queue()` handler refreshes SAFER records into KV and updates `ingest_log`; its `scheduled()` handler runs two crons — (a) a **weekly** cron that enqueues the SAFER re-ingest batch, and (b) an **every-15-minutes** cron that scans `alerts WHERE send_at <= now AND status='scheduled'` and dispatches due SMS reminders (marking each `sent`/`failed`). The Worker imports the same `functions/lib/*` modules (plain ESM) for FMCSA parsing and D1/KV helpers.

**SMS deadline alerts are timed in D1, never queued.** Cloudflare Queues cannot delay a message until a days-away `send_at` (maximum delivery delay is 12 h), so a future-dated reminder is stored as an `alerts` row and dispatched by the companion Worker's 15-minute cron — not held on a queue.

**Secrets** (set via `wrangler secret` / Pages env, read from `context.env`): `NCOA_PROVIDER_KEY` (address standardization API key — optional; deterministic fallback runs if unset), `FMCSA_WEBKEY` (SAFER query key — optional; cache-only mode if unset), `HIREAHELPER_API_KEY` (reserved for a future live labor-quote integration — **v1 uses affiliate links only, so this secret is declared but intentionally unused**; see §7.2), `SMS_PROVIDER_KEY` (SMS dispatch — optional; alerts still persist and are marked `sent` as a no-op if unset), `ADMIN_API_KEY` (admin console bearer), `AUTH_TOKEN_SECRET` (HMAC key for signing session/auth tokens). The companion Worker additionally reads `SMS_PROVIDER_KEY` and `FMCSA_WEBKEY` from its own env.

---

## 3. Complete v1 feature list

Each feature has an **acceptance criterion (AC)** a test can assert.

**Tier: Free MVP (fully anonymous, no account)**
1. **Inventory → Volume calculator.** *AC:* POST a list of items (named items and/or box counts with quantities) returns total cubic feet and CBM matching the Section 6 examples exactly.
2. **Dimensional weight estimator.** *AC:* POST L/W/H (inches) and a divisor returns dimensional weight in lbs; divisors 139/166/194 all accepted; default 166; results match Section 6.
3. **Box calculator.** *AC:* POST a bedroom count returns deterministic small/medium/large box counts (1.5/3.0/4.5 cu ft) and total box volume matching Section 6.
4. **Distance + theoretical fuel-cost estimate.** *AC:* POST origin/destination lat-lng returns driving distance (miles) and fuel cost (USD) using the fixed haversine + circuity + MPG + fuel-price constants; matches Section 6.
5. **Quote anomaly calculator.** *AC:* POST quoted weight (lbs) + volume (cu ft) returns implied density and an `is_anomalous` boolean flagged when density is outside 5.95–8.05 lb/cu ft; matches Section 6.
6. **FMCSA USDOT/MC lookup.** *AC:* GET with a USDOT or MC number returns a plain-English safety report (authorization status, whether the $750k liability minimum is met, insurance-on-file amount, crash/inspection summary) plus `source` and `fetched_at`; a known cached fixture parses to the documented report.
7. **Anonymous session.** *AC:* POST creates an anonymous session token that can own inventory states without any email/phone.

**Tier: Registered Free (account, no payment)**
8. **Register / login / logout.** *AC:* Register with email+password returns an auth token; login returns a token; logout invalidates it; passwords are PBKDF2-hashed via Web Crypto (never stored plaintext).
9. **Anonymous → registered upgrade.** *AC:* Given an anon session token and a new/existing account, all inventory states owned by the session are reassigned to the user with zero rows lost, and the session is marked upgraded.
10. **Persist inventory state.** *AC:* A registered user can save, list, load, update, and delete named inventory states; reload returns identical stored totals.
11. **Timeline orchestration graph.** *AC:* POST a move date (+ origin/destination) returns an ordered week-by-week task list with absolute due dates derived from the fixed checklist template in Section 6.
12. **NCOA address standardization + utility-transfer checklist.** *AC:* POST an address returns a standardized address (via provider API when `NCOA_PROVIDER_KEY` set, else deterministic fallback normalization) plus the static utility-transfer checklist.

**Tier: Premium Project Pass ($19.99–$29.99, one-time)**
13. **Premium purchase (one-time pass).** *AC:* POST a purchase marks the user `is_premium=1` with `premium_purchased_at`; gated endpoints then succeed for that user.
14. **Relocation Vault (quote CRUD + normalization).** *AC:* A premium user can store mover estimates; each stored quote is normalized to implied density and flagged anomalous per Section 6; non-premium users receive 402.
15. **Multi-scenario cost modeling.** *AC:* POST scenario inputs returns per-scenario totals and a cheapest-first ranking using the fixed scenario constants in Section 6; premium-gated.
16. **SMS deadline alerts.** *AC:* A premium user can schedule an alert for a timeline item; the alert is persisted to D1 (`alerts`) with `status='scheduled'` and the correct future `send_at`; the companion Worker's 15-minute cron dispatches it once due (see §2). Premium-gated.

**Programmatic / revenue**
17. **Programmatic city-pair route data.** *AC:* GET a route (origin/destination) returns distance, fuel cost, and the count of FMCSA-authorized carriers headquartered in the origin state and in the destination state (`origin_carrier_count`, `dest_carrier_count` — seed-provided fixed values in v1); a route whose combined carrier count is 0 is flagged `noindex=true`.
18. **Affiliate click logging + redirect.** *AC:* A click endpoint logs partner, target, context, click id, and owner, and returns/302s to the tracked partner URL with tracking params appended.
19. **Ad-slot config surface.** *AC:* GET returns the configured ad slots with placement + enabled flags from KV.

**Admin console (internal, admin-authed)**
20. **FMCSA ingestion health.** *AC:* GET returns the latest ingest runs (records processed, errors, status, run time); requires admin bearer.
21. **Third-party API rate/cost monitoring.** *AC:* GET returns per-provider call counts and estimated cost for a date range; requires admin bearer.
22. **Noindex suppression audit.** *AC:* GET returns route rows and their noindex flags with the reason (e.g., zero carriers); requires admin bearer.
23. **Trigger FMCSA ingest.** *AC:* POST enqueues a batch of USDOT numbers onto `MP_FMCSA_INGEST` (producer) and writes an ingest-log row; requires admin bearer. (The same batch is also enqueued automatically on a weekly schedule by the companion Worker's cron — see §2.)

---

## 4. Data model

### 4.1 D1 schema — migration `migrations/0001_init.sql`

All timestamps are ISO-8601 UTC strings (`TEXT`). Booleans are `INTEGER` (0/1). Money is stored in **USD cents** as `INTEGER` where persisted (compute in dollars, store cents) to avoid float drift; calculator responses return dollars.

```sql
-- migrations/0001_init.sql

PRAGMA foreign_keys = ON;

-- Registered users
CREATE TABLE users (
  id                 TEXT PRIMARY KEY,              -- crypto.randomUUID()
  email              TEXT NOT NULL UNIQUE,
  email_lower        TEXT NOT NULL UNIQUE,          -- lowercased for lookup
  password_hash      TEXT NOT NULL,                 -- "pbkdf2$<iterations>$<saltB64>$<hashB64>"
  is_premium         INTEGER NOT NULL DEFAULT 0,
  premium_purchased_at TEXT,
  premium_amount_cents INTEGER,                     -- 1999..2999
  is_admin           INTEGER NOT NULL DEFAULT 0,
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL
);

-- Anonymous sessions AND registered auth tokens share this table.
-- user_id NULL => anonymous session; user_id set => authenticated token.
CREATE TABLE sessions (
  id                 TEXT PRIMARY KEY,              -- crypto.randomUUID()
  token_hash         TEXT NOT NULL UNIQUE,          -- SHA-256 of the opaque bearer token
  user_id            TEXT REFERENCES users(id) ON DELETE CASCADE,
  upgraded_to_user_id TEXT REFERENCES users(id) ON DELETE SET NULL, -- set when an anon session is upgraded
  created_at         TEXT NOT NULL,
  last_seen_at       TEXT NOT NULL,
  revoked_at         TEXT
);
CREATE INDEX idx_sessions_user ON sessions(user_id);

-- Saved inventory states. Owned by EITHER a session (anon) or a user.
CREATE TABLE inventory_states (
  id                 TEXT PRIMARY KEY,
  owner_type         TEXT NOT NULL CHECK (owner_type IN ('session','user')),
  owner_id           TEXT NOT NULL,                 -- sessions.id or users.id
  name               TEXT NOT NULL,
  items_json         TEXT NOT NULL,                 -- JSON array: [{"key":"sofa","label":"Sofa","quantity":2,"volume_cuft":45.0}]
  total_cuft         REAL NOT NULL,
  total_cbm          REAL NOT NULL,
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL
);
CREATE INDEX idx_inventory_owner ON inventory_states(owner_type, owner_id);

-- Generated timelines
CREATE TABLE timelines (
  id                 TEXT PRIMARY KEY,
  user_id            TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  move_date          TEXT NOT NULL,                 -- ISO date (YYYY-MM-DD)
  origin             TEXT,
  destination        TEXT,
  tasks_json         TEXT NOT NULL,                 -- JSON array of {week_offset, due_date, category, title, done, overdue}
  created_at         TEXT NOT NULL
);
CREATE INDEX idx_timelines_user ON timelines(user_id);

-- Relocation Vault quotes (premium). Normalized numeric fields only; no raw PDF bytes.
CREATE TABLE vault_quotes (
  id                 TEXT PRIMARY KEY,
  user_id            TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mover_name         TEXT NOT NULL,
  mover_usdot        TEXT,                          -- optional, links to FMCSA lookup
  quoted_price_cents INTEGER,
  quoted_weight_lbs  REAL,
  quoted_volume_cuft REAL,
  implied_density    REAL,                          -- computed, nullable if inputs incomplete
  is_anomalous       INTEGER NOT NULL DEFAULT 0,
  anomaly_reason     TEXT,
  extracted_text     TEXT,                          -- optional client-extracted PDF text
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL
);
CREATE INDEX idx_vault_user ON vault_quotes(user_id);

-- SMS deadline alerts (premium)
CREATE TABLE alerts (
  id                 TEXT PRIMARY KEY,
  user_id            TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  timeline_id        TEXT REFERENCES timelines(id) ON DELETE SET NULL,
  task_title         TEXT NOT NULL,
  phone              TEXT NOT NULL,                 -- stored only for premium alert dispatch
  send_at            TEXT NOT NULL,                 -- ISO datetime
  status             TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','sent','failed','cancelled')),
  created_at         TEXT NOT NULL
);
CREATE INDEX idx_alerts_user ON alerts(user_id);

-- Affiliate click log
CREATE TABLE affiliate_clicks (
  id                 TEXT PRIMARY KEY,
  click_id           TEXT NOT NULL,                 -- generated tracking id passed to partner
  partner            TEXT NOT NULL,                 -- 'hireahelper' | 'packaging' | 'utility' | 'truck'
  target_url         TEXT NOT NULL,
  route_context      TEXT,                          -- e.g. "chicago-il_austin-tx" or "box-calculator"
  owner_type         TEXT,                          -- 'session' | 'user' | null
  owner_id           TEXT,
  created_at         TEXT NOT NULL
);
CREATE INDEX idx_clicks_partner ON affiliate_clicks(partner, created_at);

-- FMCSA ingest run log (admin health)
CREATE TABLE ingest_log (
  id                 TEXT PRIMARY KEY,
  source             TEXT NOT NULL,                 -- 'fmcsa_safer'
  run_at             TEXT NOT NULL,
  records_processed  INTEGER NOT NULL DEFAULT 0,
  errors             INTEGER NOT NULL DEFAULT 0,
  status             TEXT NOT NULL CHECK (status IN ('queued','running','success','partial','failed')),
  detail             TEXT
);

-- Third-party API usage meter (admin cost monitoring)
CREATE TABLE api_usage (
  id                 TEXT PRIMARY KEY,
  provider           TEXT NOT NULL,                 -- 'ncoalink' | 'fmcsa' | 'hireahelper' | 'sms'
  day                TEXT NOT NULL,                 -- YYYY-MM-DD
  calls              INTEGER NOT NULL DEFAULT 0,
  cost_cents         INTEGER NOT NULL DEFAULT 0,
  UNIQUE(provider, day)
);

-- Programmatic city-pair route rows
CREATE TABLE route_pages (
  id                 TEXT PRIMARY KEY,              -- slug: "chicago-il_austin-tx"
  origin_city        TEXT NOT NULL,
  origin_state       TEXT NOT NULL,
  origin_lat         REAL NOT NULL,
  origin_lng         REAL NOT NULL,
  dest_city          TEXT NOT NULL,
  dest_state         TEXT NOT NULL,
  dest_lat           REAL NOT NULL,
  dest_lng           REAL NOT NULL,
  distance_miles     REAL NOT NULL,
  fuel_cost_usd      REAL NOT NULL,
  origin_carrier_count INTEGER NOT NULL DEFAULT 0,   -- FMCSA-authorized carriers HQ'd in origin_state (seed-provided fixed value in v1)
  dest_carrier_count   INTEGER NOT NULL DEFAULT 0,   -- FMCSA-authorized carriers HQ'd in dest_state (seed-provided fixed value in v1)
  noindex            INTEGER NOT NULL DEFAULT 0,
  noindex_reason     TEXT,
  generated_at       TEXT NOT NULL
);
CREATE INDEX idx_routes_noindex ON route_pages(noindex);
```

### 4.2 Seed data — `migrations/0002_seed.sql`

Seed one admin user (email `admin@movepilot.local`, `is_admin=1`, password hash to be inserted by the seed script computed at build time — the seed SQL contains a precomputed PBKDF2 hash string; document the plaintext in README as `ChangeMe!Admin1` for local dev only), and 5 sample `route_pages` rows (Chicago↔Austin, LA↔NYC, Seattle↔Denver, Miami↔Atlanta, and a deliberately empty rural pair flagged `noindex=1, noindex_reason='zero_authorized_carriers'` with `origin_carrier_count=0, dest_carrier_count=0`). Provide the exact coordinates and computed distance/fuel using the Section 6 formulas, plus fixed `origin_carrier_count`/`dest_carrier_count` values for each populated row (any positive integers — these are v1 seed values, not derived from a live per-state carrier index).

### 4.3 KV layouts

KV binding **`MP_KV`**. Keys:
- `config:item_volumes` → JSON object mapping item key → `{label, volume_cuft}`, seeded from `seed/item_volumes.json`. **v1 catalog — exact contents of `seed/item_volumes.json` (box keys included so `/api/calc/volume` can resolve `key:"small"|"medium"|"large"` uniformly):**
  ```json
  {
    "sofa":         {"label":"Sofa (3-seat)",       "volume_cuft":45.0},
    "loveseat":     {"label":"Loveseat",            "volume_cuft":30.0},
    "armchair":     {"label":"Armchair",            "volume_cuft":20.0},
    "queen_bed":    {"label":"Queen bed + mattress","volume_cuft":60.0},
    "king_bed":     {"label":"King bed + mattress", "volume_cuft":70.0},
    "twin_bed":     {"label":"Twin bed + mattress", "volume_cuft":40.0},
    "dresser":      {"label":"Dresser",             "volume_cuft":25.0},
    "nightstand":   {"label":"Nightstand",          "volume_cuft":8.0},
    "dining_table": {"label":"Dining table",        "volume_cuft":35.0},
    "dining_chair": {"label":"Dining chair",        "volume_cuft":5.0},
    "refrigerator": {"label":"Refrigerator",        "volume_cuft":60.0},
    "washer":       {"label":"Washer",              "volume_cuft":25.0},
    "dryer":        {"label":"Dryer",               "volume_cuft":25.0},
    "tv_stand":     {"label":"TV stand",            "volume_cuft":20.0},
    "bookshelf":    {"label":"Bookshelf",           "volume_cuft":20.0},
    "desk":         {"label":"Desk",                "volume_cuft":25.0},
    "wardrobe_box": {"label":"Wardrobe box",        "volume_cuft":13.0},
    "small":        {"label":"Small box",           "volume_cuft":1.5},
    "medium":       {"label":"Medium box",          "volume_cuft":3.0},
    "large":        {"label":"Large box",           "volume_cuft":4.5}
  }
  ```
- `config:box_sizes` → JSON `{"small":1.5,"medium":3.0,"large":4.5}`.
- `config:dim_divisors` → JSON `{"domestic_default":166,"low":139,"high":194,"air_kg_per_cbm":167,"ocean_kg_per_cbm":1000}`.
- `config:ad_slots` → JSON array of ad slots (Section 7).
- `config:box_rates_per_bedroom` → JSON `{"small":7,"medium":11,"large":7}`.
- `fmcsa:usdot:<number>` → JSON cached SAFER record `{ raw, parsed, fetched_at, source }`. TTL 7 days (`expirationTtl: 604800`).
- `fmcsa:mc:<number>` → same shape (MC→USDOT resolvable record).

### 4.4 Queue message shapes

Queue **`MP_FMCSA_INGEST`** — the **producer** binding exists on BOTH the Pages project (used by `POST /api/admin/ingest/trigger`) AND the companion Worker (used by its weekly cron to enqueue the re-ingest batch); the **consumer** runs only in the companion Worker (`worker/index.js`, see §2 and §8). Message body:
```json
{ "type": "fmcsa_refresh", "usdot": "1234567", "ingest_run_id": "<uuid>" }
```
**There is no SMS queue.** SMS deadline alerts are persisted as `alerts` rows (`status='scheduled'`, future `send_at`) and dispatched by the companion Worker's 15-minute cron, which selects `alerts WHERE send_at <= now() AND status='scheduled'`, sends via the SMS provider (or marks `sent` as a no-op when `SMS_PROVIDER_KEY` is unset), and updates `status` to `sent`/`failed`. A queue cannot hold a message until a days-away `send_at` (max delivery delay 12 h), so the timer lives in D1, not a queue.

### 4.5 Anonymous → registered upgrade (data-loss-free)

`sessions` rows with `user_id IS NULL` are anonymous. `inventory_states` owned by an anon session use `owner_type='session', owner_id=<sessions.id>`. On upgrade (Section 5 `POST /api/session/upgrade`): in a single D1 batch, (a) ensure/create the user, (b) `UPDATE inventory_states SET owner_type='user', owner_id=<user.id>, updated_at=? WHERE owner_type='session' AND owner_id=<session.id>`, (c) `UPDATE sessions SET upgraded_to_user_id=<user.id>, user_id=<user.id> WHERE id=<session.id>`. No rows are deleted. The AC test asserts the count of inventory rows before == after and all now owned by the user.

---

## 5. API contract

Conventions: JSON request/response. Success bodies wrapped `{ "ok": true, "data": {...} }`; error bodies `{ "ok": false, "error": { "code": "<STRING>", "message": "<human>" } }`. Auth via `Authorization: Bearer <token>` (session or user token) unless noted. Standard error codes: `400 VALIDATION`, `401 UNAUTHENTICATED`, `402 PREMIUM_REQUIRED`, `403 FORBIDDEN`, `404 NOT_FOUND`, `409 CONFLICT`, `429 RATE_LIMITED`, `500 INTERNAL`, `502 UPSTREAM`.

### Calculators (no auth required; anonymous-friendly)

| Method | Path | Auth | Request | Success (200) | Errors |
|---|---|---|---|---|---|
| POST | `/api/calc/volume` | none | `{ items:[{key?,label?,quantity:int>0,volume_cuft?}] }` — if `key` given, resolve `volume_cuft` from KV `config:item_volumes`; `key` may be `small`/`medium`/`large` box | `{ total_cuft, total_cbm, line_items:[{key,label,quantity,volume_cuft,subtotal_cuft}] }` | 400 if items empty / unknown key / quantity≤0 |
| POST | `/api/calc/dimensional-weight` | none | `{ length_in>0, width_in>0, height_in>0, divisor?:139\|166\|194 (default 166) }` | `{ cubic_inches, divisor, dimensional_weight_lbs }` | 400 if non-positive dims or unsupported divisor |
| POST | `/api/calc/boxes` | none | `{ bedrooms:int 1..10 }` | `{ bedrooms, boxes:{small,medium,large}, total_box_volume_cuft }` | 400 if bedrooms out of range |
| POST | `/api/calc/distance-fuel` | none | `{ origin:{lat,lng}, destination:{lat,lng} }` | `{ great_circle_miles, driving_miles, gallons, fuel_cost_usd, constants:{mpg,fuel_price_usd_per_gal,circuity} }` | 400 if lat/lng out of range |
| POST | `/api/calc/quote-anomaly` | none | `{ quoted_weight_lbs>0, quoted_volume_cuft>0 }` | `{ implied_density, baseline:7.0, lower_bound:5.95, upper_bound:8.05, deviation_pct, is_anomalous, reason }` | 400 if non-positive |

### FMCSA

| Method | Path | Auth | Request | Success (200) | Errors |
|---|---|---|---|---|---|
| GET | `/api/fmcsa/lookup` | none | query `?usdot=<n>` or `?mc=<n>` (exactly one) | `{ found:true, carrier_name, usdot, mc, operating_status, authorized_for_hhg:bool, insurance_on_file_usd, meets_750k_minimum:bool, crash_total, inspection_total, plain_english:[strings], source, fetched_at }` | 400 if neither/both params; 200 with `{found:false, reason, source, fetched_at}` if not verifiable; 502 on upstream failure with stale-cache note |

Behavior: check KV `fmcsa:usdot:<n>` (or resolve `mc:<n>`). On hit, return parsed. On miss and `FMCSA_WEBKEY` set, `fetch` SAFER, parse via `parseFmcsaRecord()`, cache to KV (TTL 7d), increment `api_usage` provider `fmcsa`. On miss and no key, return `{found:false, reason:'not_cached', ...}`. Always include `source:'FMCSA SAFER'` and `fetched_at`.

### Address / NCOA

| Method | Path | Auth | Request | Success (200) | Errors |
|---|---|---|---|---|---|
| POST | `/api/address/standardize` | none | `{ street, city, state, zip }` | `{ standardized:{street,city,state,zip,zip4?}, provider:'ncoalink'\|'fallback', utility_checklist:[{category,task}] }` | 400 if missing fields |

Behavior: if `NCOA_PROVIDER_KEY` set, call provider, increment `api_usage` provider `ncoalink` (`cost_cents` += 1, representing $0.01/record). Else run deterministic fallback (`standardizeAddressFallback`). Always append the static `UTILITY_CHECKLIST`.

### Auth & sessions

| Method | Path | Auth | Request | Success | Errors |
|---|---|---|---|---|---|
| POST | `/api/session/anon` | none | `{}` | 201 `{ session_token, session_id }` | — |
| POST | `/api/auth/register` | none | `{ email, password (≥8) }` | 201 `{ user_id, auth_token }` | 400 validation; 409 email exists |
| POST | `/api/auth/login` | none | `{ email, password }` | 200 `{ user_id, auth_token, is_premium }` | 400; 401 bad creds |
| POST | `/api/auth/logout` | Bearer | `{}` | 200 `{ revoked:true }` | 401 |
| POST | `/api/session/upgrade` | Bearer (anon session token) | `{ email, password }` (register-or-attach) | 200 `{ user_id, auth_token, inventory_migrated:int }` | 400; 401 if token not an anon session; 409 if email exists with mismatched password |

### Inventory (registered)

| Method | Path | Auth | Request | Success | Errors |
|---|---|---|---|---|---|
| POST | `/api/inventory/save` | Bearer | `{ name, items:[...] }` (same item shape as calc/volume) | 201 `{ id, total_cuft, total_cbm }` (recomputed server-side) | 400; 401 |
| GET | `/api/inventory/list` | Bearer | — | 200 `{ items:[{id,name,total_cuft,total_cbm,updated_at}] }` | 401 |
| GET | `/api/inventory/[id]` | Bearer | — | 200 `{ id,name,items,total_cuft,total_cbm,... }` | 401; 404 |
| PUT | `/api/inventory/[id]` | Bearer | `{ name?, items? }` | 200 `{ id, total_cuft, total_cbm }` | 400;401;404 |
| DELETE | `/api/inventory/[id]` | Bearer | — | 200 `{ deleted:true }` | 401;404 |

Anonymous session tokens MAY also save/list/load/update/delete inventory they own (owner_type='session'); the handler branches on whether the token maps to a user or an anon session. Registered-user tokens see only their own; anon tokens see only their session's.

### Timeline (registered)

| Method | Path | Auth | Request | Success | Errors |
|---|---|---|---|---|---|
| POST | `/api/timeline/generate` | Bearer (user) | `{ move_date:'YYYY-MM-DD', origin?, destination? }` | 201 `{ id, move_date, tasks:[{week_offset,due_date,category,title,done:false,overdue:bool}] }` | 400 (bad/past date rules per §6); 401 |
| GET | `/api/timeline/[id]` | Bearer (user) | — | 200 timeline object | 401;404 |

### Vault (PREMIUM-gated)

All return **402 PREMIUM_REQUIRED** if the authenticated user is not `is_premium`.

| Method | Path | Auth | Request | Success | Errors |
|---|---|---|---|---|---|
| POST | `/api/vault/quotes` | Bearer premium | `{ mover_name, mover_usdot?, quoted_price_usd?, quoted_weight_lbs?, quoted_volume_cuft?, extracted_text? }` | 201 `{ id, implied_density, is_anomalous, anomaly_reason }` | 400;401;402 |
| GET | `/api/vault/quotes` | Bearer premium | — | 200 `{ quotes:[...] }` | 401;402 |
| GET | `/api/vault/quotes/[id]` | Bearer premium | — | 200 quote | 401;402;404 |
| PUT | `/api/vault/quotes/[id]` | Bearer premium | partial fields | 200 recomputed quote | 400;401;402;404 |
| DELETE | `/api/vault/quotes/[id]` | Bearer premium | — | 200 `{ deleted:true }` | 401;402;404 |
| POST | `/api/vault/scenario` | Bearer premium | `{ distance_miles>0, labor_hours≥0, weight_lbs>0 }` | 200 `{ scenarios:[{name,line_items:[{label,amount_usd}],total_usd}], ranked:[names cheapest-first] }` | 400;401;402 |
| POST | `/api/vault/alerts` | Bearer premium | `{ timeline_id?, task_title, phone, send_at }` | 201 `{ alert_id, status:'scheduled' }` (persists to D1 `alerts`; the companion Worker's cron dispatches it when `send_at` is due — see §2/§4.4) | 400;401;402 |

### Premium purchase

| Method | Path | Auth | Request | Success | Errors |
|---|---|---|---|---|---|
| POST | `/api/premium/purchase` | Bearer (user) | `{ amount_usd:number in [19.99,29.99] }` (v1 mock payment — no real gateway) | 200 `{ is_premium:true, premium_purchased_at }` | 400 (amount out of range); 401 |

### Affiliate & ad config

| Method | Path | Auth | Request | Success | Errors |
|---|---|---|---|---|---|
| POST | `/api/affiliate/click` | optional Bearer | `{ partner:'hireahelper'\|'packaging'\|'utility'\|'truck', context? }` | 200 `{ click_id, redirect_url }` | 400 unknown partner |
| GET | `/api/affiliate/go` | optional Bearer | query `?partner=&context=` | 302 redirect to tracked partner URL (logs click) | 400 |
| GET | `/api/config/ad-slots` | none | — | 200 `{ slots:[{id,placement,enabled,size}] }` | — |

### Routes (programmatic)

| Method | Path | Auth | Request | Success | Errors |
|---|---|---|---|---|---|
| GET | `/api/routes/[slug]` | none | slug `origin-st_dest-st` | 200 `{ origin:{city,state,lat,lng}, destination:{city,state,lat,lng}, distance_miles, fuel_cost_usd, origin_carrier_count, dest_carrier_count, noindex, noindex_reason }` (origin/destination carry coordinates so the /move page can feed `/api/calc/estimate`) | 404 unknown slug |

> **Descoped in v1 (research-noted, deferred):** per-route *seasonal pricing multipliers* (research §9's summer-premium data) are intentionally NOT shipped — no fixed seasonal constant is presented in v1 so the platform never surfaces unvalidated precision. Add later as a fixed monthly-multiplier table if a defensible data source is secured.

### Admin (bearer must equal `ADMIN_API_KEY` OR user with `is_admin=1`)

| Method | Path | Auth | Request | Success | Errors |
|---|---|---|---|---|---|
| GET | `/api/admin/ingest-health` | admin | query `?limit=` | 200 `{ runs:[...] }` | 401;403 |
| GET | `/api/admin/api-usage` | admin | query `?from=&to=` | 200 `{ usage:[{provider,day,calls,cost_cents}], totals:{...} }` | 401;403 |
| GET | `/api/admin/noindex-audit` | admin | — | 200 `{ routes:[{id,noindex,noindex_reason,origin_carrier_count,dest_carrier_count}] }` | 401;403 |
| POST | `/api/admin/ingest/trigger` | admin | `{ usdots:[string] }` | 202 `{ ingest_run_id, enqueued:int }` | 400;401;403 |

---

## 6. Business logic & algorithms

All constants are FIXED and live in `functions/lib/constants.js` (mirrored into KV seed). **Rounding rules (apply at response boundary, using round-half-up):** cubic feet → 2 decimals; CBM → 4 decimals; dimensional weight lbs → 2 decimals; density → 2 decimals; USD → 2 decimals; miles → 2 decimals; kg → 2 decimals; gallons → not rounded internally (kept full precision), displayed to 3 decimals. Implement one shared `round(value, decimals)` helper (round-half-up: `Math.round(value * 10**d + Number.EPSILON) / 10**d`). Every example below is a REQUIRED test fixture and MUST match to the stated decimals exactly.

### 6.1 Inventory → Volume

```
total_cuft = Σ (quantity_i × standard_volume_i)      // over all line items
total_cbm  = total_cuft × 0.0283168
```
Box constants: **small = 1.5**, **medium = 3.0** (defined as 18"×18"×16"), **large = 4.5** cu ft. Named-item volumes come from KV `config:item_volumes`, seeded from `seed/item_volumes.json` (full catalog enumerated in §4.3).

- **Example A:** items = 10 medium (3.0), 5 small (1.5), 2 large (4.5).
  `total_cuft = 10×3.0 + 5×1.5 + 2×4.5 = 30 + 7.5 + 9 = 46.50`.
  `total_cbm = 46.5 × 0.0283168 = 1.3167312 → 1.3167`.
- **Example B:** items = 32 medium.
  `total_cuft = 32×3.0 = 96.00`. `total_cbm = 96 × 0.0283168 = 2.7184128 → 2.7184`.
- **Example C (named items):** 1 sofa (45.0), 1 queen_bed (60.0), 4 dining_chair (5.0 each).
  `total_cuft = 45 + 60 + 20 = 125.00`. `total_cbm = 125 × 0.0283168 = 3.5396`.

### 6.2 Dimensional weight

```
cubic_inches            = length_in × width_in × height_in
dimensional_weight_lbs  = cubic_inches / divisor        // divisor ∈ {139, 166 (default domestic), 194}
```
International air chargeable weight uses `chargeable_kg = CBM × 167`. (Ocean freight reference constant: 1000 kg per CBM — provided as a KV constant; no v1 endpoint.)

- **Example A:** 18×18×16 = 5184 cu in.
  `/166 = 31.228915… → 31.23`; `/139 = 37.294964… → 37.29`; `/194 = 26.721649… → 26.72`.
- **Example B:** 24×24×24 = 13824 cu in.
  `/166 = 83.277108… → 83.28`; `/139 = 99.453237… → 99.45`; `/194 = 71.257731… → 71.26`.
- **Air example:** CBM 1.3167 → `1.3167 × 167 = 219.8889 → 219.89 kg`. CBM 2.7184 → `2.7184 × 167 = 453.9728 → 453.97 kg`.

### 6.3 Box calculator

Per-bedroom constants (KV `config:box_rates_per_bedroom`): **small = 7, medium = 11, large = 7** boxes per bedroom (integer multiply).
```
small  = 7  × bedrooms
medium = 11 × bedrooms
large  = 7  × bedrooms
total_box_volume_cuft = small×1.5 + medium×3.0 + large×4.5
```
- **Example A:** bedrooms = 3 → small 21, medium 33, large 21.
  `volume = 21×1.5 + 33×3.0 + 21×4.5 = 31.5 + 99 + 94.5 = 225.00`.
- **Example B:** bedrooms = 1 → small 7, medium 11, large 7.
  `volume = 10.5 + 33 + 31.5 = 75.00`.
(These fall within the research ranges for a 3-bedroom home: 15–25 small, 25–40 medium, 15–30 large.)

### 6.4 Distance + theoretical fuel cost

Constants: Earth radius `R = 3958.8` miles; road **circuity factor = 1.2**; moving-truck economy `MPG = 10`; fuel price `FUEL_PRICE_USD_PER_GAL = 3.50`.
```
// Haversine great-circle
φ1,φ2 = lat in radians ; Δφ = (lat2−lat1)·π/180 ; Δλ = (lng2−lng1)·π/180
a = sin²(Δφ/2) + cos(φ1)·cos(φ2)·sin²(Δλ/2)
c = 2 · atan2(√a, √(1−a))
great_circle_miles = R · c                         // round 2 dec at boundary
driving_miles      = great_circle_miles × 1.2      // round 2 dec at boundary (computed from unrounded GC)
// Fuel (takes driving_miles, already rounded to 2 dec, as its input)
gallons       = driving_miles / MPG                // MPG = 10
fuel_cost_usd = gallons × 3.50                     // round 2 dec
```
- **Distance Example A:** origin (0,0) → destination (1,0) [1° latitude].
  `great_circle_miles = 3958.8 × 0.017453293 = 69.09409… → 69.09`; `driving_miles = 69.09409×1.2 = 82.91291 → 82.91` (driving computed from the UNROUNDED great-circle value).
- **Distance Example B:** origin (0,0) → destination (0,2) [2° longitude at equator].
  `great_circle_miles = 138.18819… → 138.19`; `driving_miles = 138.18819×1.2 = 165.82583 → 165.83` (driving computed from the UNROUNDED great-circle value).
- **Fuel Example A:** driving_miles = 1000.00 → `gallons = 100.000`, `fuel_cost = 100 × 3.50 = 350.00`.
- **Fuel Example B:** driving_miles = 82.91 → `gallons = 8.291`, `fuel_cost = 8.291 × 3.50 = 29.0185 → 29.02`.

### 6.5 Quote normalization / anomaly detection

Constants: baseline density `7.0` lb/cu ft; tolerance ±15% → lower `5.95`, upper `8.05`.
```
implied_density = quoted_weight_lbs / quoted_volume_cuft        // round 2 dec
deviation_pct   = |implied_density − 7.0| / 7.0 × 100           // round 2 dec
is_anomalous    = (implied_density < 5.95) OR (implied_density > 8.05)
reason          = is_anomalous ? "Implied density {d} lb/cu ft is outside the 5.95–8.05 range (>15% from the 7.0 baseline); possible non-binding-estimate inflation / hostage-load risk." : "Within normal household-goods density range."
```
- **Example A (normal):** 7000 lbs / 1000 cu ft = `7.00` → within [5.95,8.05] → `is_anomalous=false`, deviation 0.00%.
- **Example B (low, anomalous):** 5000 / 1000 = `5.00` → < 5.95 → `is_anomalous=true`, deviation `28.57%`.
- **Example C (high, anomalous):** 9000 / 1000 = `9.00` → > 8.05 → `is_anomalous=true`, deviation `28.57%`.
- **Example D (boundary, normal):** 12000 / 1500 = `8.00` → ≤ 8.05 → `is_anomalous=false`, deviation `14.29%`.

### 6.6 Multi-scenario cost modeling

Constants (`functions/lib/constants.js`): `TRUCK_BASE_USD=40.00`, `TRUCK_MILEAGE_USD_PER_MI=1.00`, `LABOR_RATE_USD_PER_HR=60.00`, `CONTAINER_BASE_USD=200.00`, `CONTAINER_MILEAGE_USD_PER_MI=2.50`, `FULLSERVICE_USD_PER_LB=0.70`. Fuel reuses §6.4.
```
DIY truck        = TRUCK_BASE + distance×TRUCK_MILEAGE + fuel_cost(distance) + labor_hours×LABOR_RATE
Container        = CONTAINER_BASE + distance×CONTAINER_MILEAGE
Full-service     = weight_lbs × FULLSERVICE_USD_PER_LB
ranked = scenarios sorted by total ascending (ties broken alphabetically by name)
```
- **Example:** distance=1000, labor_hours=8, weight=7000.
  DIY = `40 + 1000×1.00 + 350.00 + 8×60 = 40 + 1000 + 350 + 480 = 1870.00`.
  Container = `200 + 1000×2.50 = 2700.00`.
  Full-service = `7000 × 0.70 = 4900.00`.
  ranked = `["DIY truck","Container","Full-service"]`.
- **Example 2:** distance=250, labor_hours=4, weight=3000.
  DIY = `40 + 250 + fuel(250)=87.50 + 240 = 617.50`. Container = `200 + 625 = 825.00`. Full-service = `3000×0.70 = 2100.00`. ranked `["DIY truck","Container","Full-service"]`. (fuel(250)= 250/10×3.5 = 87.50.)

### 6.7 Timeline generation

Input `move_date` (YYYY-MM-DD). Reject if not parseable or if `move_date` is in the past relative to `new Date()` (server date). Fixed template (`functions/lib/timeline-template.js`); each task has a `week_offset` = weeks BEFORE the move (0 = move week; positive = weeks prior). `due_date = move_date − (week_offset × 7 days)` (ISO date). Tasks with a `due_date` earlier than today are still returned but flagged `overdue:true`.

Template (category, week_offset, title):
```
("carrier",   8, "Research movers & verify FMCSA authorization")
("inventory", 6, "Run inventory volume & box calculator; order supplies")
("declutter", 6, "Declutter / sell / donate items you won't move")
("address",   4, "File USPS change of address (NCOA) — official fee is $1.25")
("utilities", 4, "Schedule utility transfers/disconnects")
("family",    4, "Confirm school enrollment / records-transfer deadlines")
("carrier",   2, "Confirm carrier, re-verify FMCSA status, review binding vs non-binding estimate")
("packing",   1, "Pack non-essentials; label boxes by room")
("moveweek",  0, "Moving week: final walkthrough, meter readings, hand off keys")
("address",  -1, "Post-move: update address with banks/DMV; confirm mail forwarding")
```
- **Example:** move_date `2026-08-01`. Task "Research movers…" (offset 8) → `2026-08-01 − 56 days = 2026-06-06`. "File USPS change of address" (offset 4) → `2026-07-04`. "Post-move…" (offset −1) → `2026-08-08`. (Compute due_date via UTC date arithmetic; assert these exact strings in tests using a mocked "today" before 2026-06-06 so nothing is overdue.)

### 6.8 FMCSA record parsing

`parseFmcsaRecord(raw)` maps a SAFER-shaped object to the plain-English report. Rules:
```
authorized_for_hhg = raw.operating_status matches /AUTHORIZED/i AND raw.carrier_operation includes HHG/Property
meets_750k_minimum = Number(raw.bipd_insurance_on_file) >= 750000
plain_english = [
  authorized_for_hhg ? "✅ Authorized for interstate household-goods transport." : "⚠️ NOT authorized for interstate HHG transport — do not hire for an interstate move.",
  meets_750k_minimum ? "✅ Carries at least the federal $750,000 liability minimum." : "⚠️ Liability insurance on file is below the $750,000 federal minimum.",
  `Crashes on record (24 mo): ${raw.crash_total ?? 'unknown'}.`,
  `Inspections on record: ${raw.inspection_total ?? 'unknown'}.`
]
```
- **Fixture example:** raw `{ legal_name:"ACME MOVERS INC", usdot:"1234567", mc:"MC-654321", operating_status:"AUTHORIZED FOR Property, HHG", carrier_operation:"Interstate; HHG", bipd_insurance_on_file:"1000000", crash_total:2, inspection_total:15 }` →
  `authorized_for_hhg=true, meets_750k_minimum=true, insurance_on_file_usd=1000000, plain_english[0]` starts "✅ Authorized…".
- **Fixture example 2:** raw `{ legal_name:"ROGUE HAUL LLC", usdot:"7654321", operating_status:"NOT AUTHORIZED", carrier_operation:"Interstate", bipd_insurance_on_file:"250000", crash_total:5, inspection_total:3 }` →
  `authorized_for_hhg=false, meets_750k_minimum=false`, both warning strings present.

### 6.9 Address standardization fallback

`standardizeAddressFallback({street,city,state,zip})`: trim all; uppercase `state` (2-letter, validate against US state set, else 400); title-case `city`; collapse internal whitespace in `street`; expand common suffixes (`ST`→`Street`, `AVE`→`Avenue`, `RD`→`Road`, `BLVD`→`Boulevard`, `DR`→`Drive`, `LN`→`Lane`, `CT`→`Court`) case-insensitively on the last token; keep `zip` first 5 digits; if input `zip` has `-####`, populate `zip4`. Provider path (`NCOA_PROVIDER_KEY` set) overrides fallback.
- **Example:** `{street:"123 main st",city:"austin",state:"tx",zip:"78701-1234"}` → `{street:"123 Main Street",city:"Austin",state:"TX",zip:"78701",zip4:"1234"}`, `provider:"fallback"`.

---

## 7. Revenue plumbing

### 7.1 Ad-slot config surface
KV `config:ad_slots` (seeded from `seed/ad_slots.json`), served by `GET /api/config/ad-slots`:
```json
[
  {"id":"route_top","placement":"route_page_header","size":"728x90","enabled":true},
  {"id":"route_inline","placement":"route_page_body","size":"300x250","enabled":true},
  {"id":"calc_sidebar","placement":"calculator_sidebar","size":"300x600","enabled":false},
  {"id":"timeline_footer","placement":"timeline_footer","size":"728x90","enabled":true}
]
```
Slots are enable/disable-flag-driven; disabled slots are still returned with `enabled:false` so the frontend can gate rendering.

### 7.2 Affiliate link handling
Partner registry in `functions/lib/affiliates.js`:
```
hireahelper : base "https://www.hireahelper.com/?"    params {aff_id:"movepilot", utm_source:"movepilot", utm_medium:"affiliate", utm_campaign:"labor"}   (commission on booked labor via HireAHelper API)
packaging   : base "https://packaging.example-partner.com/?" params {ref:"movepilot", utm_source:"movepilot", utm_medium:"affiliate", utm_campaign:"boxes"}
utility     : base "https://citizenhomesolutions.example/?" params {partner:"movepilot", utm_source:"movepilot", utm_medium:"affiliate", utm_campaign:"utilities"}   (Citizen Home Solutions utility transfer)
truck       : base "https://trucks.example-partner.com/?"  params {ref:"movepilot", utm_source:"movepilot", utm_medium:"affiliate", utm_campaign:"truck"}
```
On `POST /api/affiliate/click` or `GET /api/affiliate/go`: generate `click_id = crypto.randomUUID()`, append `click_id` + the partner's tracking params + `context` (as `mp_ctx`) to the base URL, insert an `affiliate_clicks` row (partner, target_url, route_context, owner if a bearer token is present, created_at), and return `{click_id, redirect_url}` (POST) or a `302 Location` (GET). Unknown partner → 400. Base URLs are configurable via `functions/lib/affiliates.js` (single source of truth).

### 7.3 Premium-pass gating
- **Gated endpoints:** all `/api/vault/*` (quotes CRUD, scenario, alerts). Verified server-side by loading the authenticated user and checking `is_premium === 1`. Not premium → **402 PREMIUM_REQUIRED**. There is no client-trusted flag; premium status is read from D1 on every gated request.
- **Not gated (free, deliberately, as linkable SEO assets):** the five stateless calculators (`/api/calc/*`) and the FMCSA lookup. The Vault's *persistence and batch workflows* are what Premium buys.
- **Purchase:** `POST /api/premium/purchase` (v1 mock, no real gateway) validates `amount_usd ∈ [19.99, 29.99]`, sets `is_premium=1`, `premium_purchased_at=now`, `premium_amount_cents=round(amount×100)`. One-time pass — no expiry, no recurring billing.
- **Phase-3 validated-lead model (spec only, build the guard now):** a lead may only be forwarded to a carrier if `parseFmcsaRecord()` reports `authorized_for_hhg === true` AND `meets_750k_minimum === true`. Implement `isLeadEligible(usdot, env)` in `functions/lib/leads.js` that resolves the carrier from KV/FMCSA and returns that boolean. No lead-selling endpoint ships in v1; the guard exists and is unit-tested so Phase 3 can wire it in.

---

## 8. File-by-file build manifest

```
/ (repo root — Cloudflare Pages deployable at all times)
├── wrangler.toml                         # PAGES config ONLY: pages_build_output_dir, D1 (MP_DB), KV (MP_KV), queue PRODUCER (MP_FMCSA_INGEST). No [[queues.consumers]], no [triggers] — unsupported on Pages.
├── package.json                          # scripts: dev, test, seed, migrate; devDeps: vitest, wrangler
├── README.md                             # project overview + API reference table (Section 10) + admin dev creds + storage decisions
├── PIPELINE.md                           # pipeline status/handoff notes; mark backend complete + frontend-prompt-needed
├── migrations/
│   ├── 0001_init.sql                     # full schema (Section 4.1)
│   └── 0002_seed.sql                     # admin user + 5 route_pages rows (Section 4.2)
├── seed/
│   ├── item_volumes.json                 # named household item → {label, volume_cuft}
│   ├── box_sizes.json                    # {small:1.5, medium:3.0, large:4.5}
│   ├── dim_divisors.json                 # {domestic_default:166, low:139, high:194, air_kg_per_cbm:167, ocean_kg_per_cbm:1000}
│   ├── box_rates_per_bedroom.json        # {small:7, medium:11, large:7}
│   └── ad_slots.json                     # Section 7.1
├── scripts/
│   ├── seed-kv.js                        # loads seed/*.json into KV via wrangler kv (documented commands)
│   └── hash-password.js                  # dev helper to compute PBKDF2 hash for admin seed (Web Crypto)
├── functions/
│   ├── lib/
│   │   ├── constants.js                  # ALL fixed constants (Section 6): 0.0283168, divisors, R=3958.8, circuity 1.2, MPG 10, fuel 3.50, density 7.0/5.95/8.05, scenario constants, per-bedroom box rates
│   │   ├── round.js                      # round(value, decimals) round-half-up
│   │   ├── volume.js                     # computeVolume(items, itemTable)
│   │   ├── dimweight.js                  # dimensionalWeight(l,w,h,divisor); airChargeableKg(cbm)
│   │   ├── boxes.js                      # boxEstimate(bedrooms, rates)
│   │   ├── distance.js                   # haversineMiles(a,b); drivingMiles; fuelCost(miles)
│   │   ├── quote.js                      # impliedDensity/anomaly(weight, volume)
│   │   ├── scenarios.js                  # scenarioModel({distance,labor_hours,weight})
│   │   ├── timeline.js                   # generateTimeline(move_date, today)
│   │   ├── fmcsa.js                       # parseFmcsaRecord(raw); fetchAndCacheFmcsa(env, {usdot|mc})
│   │   ├── address.js                    # standardizeAddressFallback(); UTILITY_CHECKLIST; US_STATES
│   │   ├── affiliates.js                 # partner registry + buildAffiliateUrl(partner, click_id, context)
│   │   ├── leads.js                      # isLeadEligible(usdot, env)  (Phase-3 guard)
│   │   ├── auth.js                       # hashPassword/verifyPassword (PBKDF2 Web Crypto); mintToken/hashToken (HMAC + SHA-256); getSession(request, env); requireUser; requirePremium; requireAdmin
│   │   ├── db.js                          # D1 query helpers, id() = crypto.randomUUID(), now()
│   │   ├── usage.js                      # incrementApiUsage(env, provider, cost_cents)
│   │   └── respond.js                    # ok()/err() JSON helpers + CORS headers
│   ├── api/
│   │   ├── calc/volume.js
│   │   ├── calc/dimensional-weight.js
│   │   ├── calc/boxes.js
│   │   ├── calc/distance-fuel.js
│   │   ├── calc/quote-anomaly.js
│   │   ├── fmcsa/lookup.js
│   │   ├── address/standardize.js
│   │   ├── session/anon.js
│   │   ├── session/upgrade.js
│   │   ├── auth/register.js
│   │   ├── auth/login.js
│   │   ├── auth/logout.js
│   │   ├── inventory/save.js
│   │   ├── inventory/list.js
│   │   ├── inventory/[id].js              # GET/PUT/DELETE
│   │   ├── timeline/generate.js
│   │   ├── timeline/[id].js
│   │   ├── vault/quotes.js               # POST/GET (collection)
│   │   ├── vault/quotes/[id].js          # GET/PUT/DELETE
│   │   ├── vault/scenario.js
│   │   ├── vault/alerts.js
│   │   ├── premium/purchase.js
│   │   ├── affiliate/click.js
│   │   ├── affiliate/go.js
│   │   ├── config/ad-slots.js
│   │   ├── routes/[slug].js
│   │   └── admin/
│   │       ├── ingest-health.js
│   │       ├── api-usage.js
│   │       ├── noindex-audit.js
│   │       └── ingest/trigger.js
│   └── _middleware.js                    # CORS, JSON parsing guard, error-to-JSON wrapper
├── worker/                               # COMPANION WORKER (separate deploy) — Pages Functions cannot host queue consumers or cron
│   ├── index.js                          # queue() consumer: fmcsa_refresh → KV + ingest_log. scheduled() cron: (a) weekly → enqueue SAFER re-ingest batch to MP_FMCSA_INGEST; (b) every 15 min → scan D1 alerts (send_at<=now, status='scheduled') → dispatch SMS → mark sent/failed. Imports functions/lib/* (fmcsa, db, usage).
│   └── wrangler.toml                     # Worker config: D1 (MP_DB), KV (MP_KV), [[queues.producers]] + [[queues.consumers]] for MP_FMCSA_INGEST (producer so the weekly cron can enqueue), [triggers] crons = ["0 8 * * 1", "*/15 * * * *"]
└── test/
    ├── volume.test.js                    # Section 6.1 fixtures EXACT
    ├── dimweight.test.js                 # 6.2 fixtures EXACT
    ├── boxes.test.js                     # 6.3 fixtures EXACT
    ├── distance.test.js                  # 6.4 fixtures EXACT
    ├── quote.test.js                     # 6.5 fixtures EXACT
    ├── scenarios.test.js                 # 6.6 fixtures EXACT
    ├── timeline.test.js                  # 6.7 fixtures EXACT (mocked today)
    ├── fmcsa.test.js                     # 6.8 fixtures EXACT
    ├── address.test.js                   # 6.9 fixtures EXACT
    ├── auth.test.js                      # hash/verify round-trip; token mint/verify
    ├── leads.test.js                     # isLeadEligible guard
    ├── worker.test.js                    # companion Worker: queue consumer (fmcsa_refresh→KV+ingest_log) + cron alert-scan dispatch (mocked D1/KV/SMS)
    └── smoke.test.js                     # endpoint smoke tests vs `wrangler pages dev`
```

**Two wrangler configs.** Root `wrangler.toml` is the **Pages** config: `pages_build_output_dir`, D1 binding `MP_DB`, KV binding `MP_KV`, and the queue **producer** `MP_FMCSA_INGEST` ONLY — it MUST NOT declare `[[queues.consumers]]` or `[triggers]` (Pages ignores/rejects them). `worker/wrangler.toml` is the **companion Worker** config: the same D1 `MP_DB` + KV `MP_KV` bindings, BOTH `[[queues.producers]]` and `[[queues.consumers]]` for `MP_FMCSA_INGEST` (producer so the weekly cron can `.send()` the batch; consumer to process it), and `[triggers] crons = ["0 8 * * 1", "*/15 * * * *"]` (weekly SAFER re-ingest + 15-minute alert dispatch). A minimal `public/index.html` (or `_routes.json`) exists so Pages has a static output dir and the repo deploys.

---

## 9. Testing requirements

Use **Vitest**. `npm test` runs all unit + smoke tests; all must pass (exit 0) for done.

1. **Unit tests for every function in `functions/lib/`.** Each pure function (`computeVolume`, `dimensionalWeight`, `airChargeableKg`, `boxEstimate`, `haversineMiles`, `drivingMiles`, `fuelCost`, anomaly, `scenarioModel`, `generateTimeline`, `parseFmcsaRecord`, `standardizeAddressFallback`, `buildAffiliateUrl`, `isLeadEligible`, password hash/verify, token mint/verify) has direct tests.
2. **Equation tests MUST match Section 6 hand-computed outputs EXACTLY** (to the stated decimals). Encode the fixtures verbatim:
   - volume: `46.50`/`1.3167`, `96.00`/`2.7184`, `125.00`/`3.5396`.
   - dimweight: `31.23`/`37.29`/`26.72` (5184), `83.28`/`99.45`/`71.26` (13824); air `219.89`, `453.97`.
   - boxes: 3BR → `{21,33,21}`/`225.00`; 1BR → `{7,11,7}`/`75.00`.
   - distance: 1°lat → GC `69.09`, driving `82.91`; 2°lon → GC `138.19`, driving `165.83`; fuel(1000)=`350.00`, fuel(82.91)=`29.02`.
   - quote: `7.00`/false, `5.00`/true/`28.57`, `9.00`/true/`28.57`, `8.00`/false/`14.29`.
   - scenarios: dist1000 → DIY `1870.00`, Container `2700.00`, Full `4900.00`; dist250 → `617.50`/`825.00`/`2100.00`.
   - timeline: move `2026-08-01`, today mocked `2026-06-01` → offset-8 due `2026-06-06`, offset-4 due `2026-07-04`, offset-(−1) due `2026-08-08`.
   - fmcsa: the two fixtures in §6.8.
   - address: the §6.9 fixture.
3. **Endpoint smoke tests** boot `npx wrangler pages dev` (with a local D1 migrated + KV seeded) and hit each route for a 2xx/expected-error: every calculator, fmcsa lookup (cached fixture), address, anon session, register/login/logout, upgrade (assert inventory count preserved), inventory CRUD, timeline, premium purchase then vault CRUD + scenario + alert (assert 402 before purchase), affiliate click (assert row logged), ad-slots, routes, and all admin endpoints (assert 401 without admin bearer, 200 with).
4. **No test may hit the live internet.** FMCSA/NCOA/SMS/HireAHelper external calls are behind env-key checks; tests run in fallback/cache-only mode. Provide the cached FMCSA fixture directly in local KV during smoke setup.
5. **Companion Worker tests (`test/worker.test.js`).** The Worker's `queue()` consumer and `scheduled()` cron cannot be exercised by `wrangler pages dev`; unit-test their pure logic directly with mocked D1/KV/SMS: (a) a `fmcsa_refresh` message writes the parsed record to KV and updates `ingest_log`; (b) the cron scan selects exactly the `alerts` rows with `send_at <= now AND status='scheduled'`, dispatches them, and marks each `sent` (or `failed`). Optionally run `wrangler dev worker/` with a manual queue-publish / `--test-scheduled` check.

Document exact local run in README: `npm run migrate` (applies `migrations/*.sql` to local D1), `npm run seed` (loads KV), `npm run dev`, `npm test`.

---

## 10. Documentation requirements

- **`README.md`** must contain: (a) project overview + the four core principles; (b) storage-decision table (Section 2) including the "no R2 / PDF bytes not persisted" note and the companion-Worker architecture (queue consumer + cron for FMCSA re-ingest and SMS dispatch); (c) local dev quickstart (migrate, seed, dev, test) with the admin dev credentials (`admin@movepilot.local` / `ChangeMe!Admin1`, local only); (d) a full **API reference table** with columns **Method | Path | Auth | Request | Response | Errors** covering every endpoint in Section 5; (e) the fixed constants list from Section 6 and where they live (`functions/lib/constants.js` + KV).
- **Inline comments:** every formula in `functions/lib/*` carries a comment citing its Section 6 subsection and the constant values; every non-obvious branch (anon-vs-user ownership, premium gating, FMCSA cache-hit/miss, NCOA provider-vs-fallback) is commented.
- **`PIPELINE.md`:** record that the backend is built, all tests green, every endpoint smoke-tested, and that the frontend build prompt is the next required artifact.

---

## 11. Definition of done

The build is DONE only when ALL of the following hold:
1. Every feature in Section 3 meets its acceptance criterion.
2. `npm test` passes with zero failures; every Section 6 equation test matches the hand-computed fixtures EXACTLY to the stated decimals.
3. Every endpoint in Section 5 has been smoke-tested live under `npx wrangler pages dev` (2xx or the documented error), including: anon→registered upgrade preserving inventory row count; vault endpoints returning 402 before purchase and 2xx after; admin endpoints returning 401/403 without an admin bearer and 200 with; affiliate click logging a row; FMCSA lookup returning a parsed cached fixture with `source` + `fetched_at`.
4. `migrations/0001_init.sql` + `0002_seed.sql` apply cleanly to a fresh local D1; `scripts/seed-kv.js` loads all KV config keys.
5. The repo builds and deploys as **two Cloudflare targets**: the **Pages project** (root `wrangler.toml` valid, static output dir present, Functions under `functions/`) and the **companion Worker** (`worker/wrangler.toml` valid, `[[queues.producers]]` + `[[queues.consumers]]` + `[triggers]` crons declared). No Node-only API is used anywhere.
6. `README.md` (with the full API reference table) and `PIPELINE.md` are updated; the frontend build prompt is flagged as the next artifact to generate.
7. Nothing is left as a TODO, stub, mock (except the explicitly-specified v1 mock payment), or unverified path. If any requirement in this document conflicts with another, HALT and report the conflict rather than guessing.

---

## 12. Addendum — anonymous estimate, geocoding, item catalog, alert listing

> These endpoints **EXTEND** the contract above (they do not modify existing endpoints). They exist because the frontend's anonymous hero and tools require capabilities §5 does not cover: a move-level weight + cost estimate for an unauthenticated visitor, ZIP→coordinate resolution, the named-item catalog, and listing scheduled alerts. Implement with the same rigor — Workers runtime, unit tests matching the §12.5 hand-computed fixtures exactly. All new calculators are **anonymous / no auth** except the premium alert list.

### 12.1 New constants (add to `functions/lib/constants.js`)
```
BEDROOM_CUFT = { studio:300, one:450, two:840, three:1300, four:1800 }  // canonical volume presets
HHG_DENSITY_LB_PER_CUFT = 7.0        // (already the quote-anomaly baseline) est weight = round(cuft × 7)
FS_BASE_USD_PER_LB      = 0.55       // full-service base rate per lb
FS_DIST_COEFF           = 0.00017    // per-lb add-on per driving mile
ESTIMATE_RANGE_PCT      = 0.15       // ±15% → cost_low / cost_high
FULLSERVICE_MIN_MILES   = 150        // recommendation threshold (>= → full_service, else diy)
```

### 12.2 Features (append to §3)
24. **Anonymous move estimate.** *AC:* POST bedrooms (or total_cuft) + origin/destination (lat/lng or ZIP) returns total_cuft, est_weight_lbs, distance_miles, fuel_cost_usd, cost_low_usd, cost_high_usd, and a recommendation; matches §12.5 fixtures; no auth.
25. **Geocode resolve.** *AC:* GET `?zip=NNNNN` returns `{lat,lng,city,state}` from the seeded ZIP-3 centroid table; unseeded prefix → 200 `{found:false}`; no auth.
26. **Item catalog.** *AC:* GET returns the named-item catalog and the bedroom presets (cuft + sample item list); no auth.
27. **List scheduled alerts.** *AC:* GET returns the authenticated premium user's alerts; 402 if not premium.

### 12.3 Data-model additions
- Seed file **`seed/zip3_centroids.json`**: ZIP-3 prefix → `{lat,lng,city,state}`. Ship a documented STARTER set of **≥40 major-metro prefixes** loaded into KV as `geo:zip3:<prefix>` by `scripts/seed-kv.js` (the `geo` lib may also read the JSON directly for v1). MUST include the hero default and the §4.2 route cities: `"100"` New York NY (40.7506,−73.9971), `"303"` Atlanta GA (33.7490,−84.3880), `"606"` Chicago IL, `"787"` Austin TX, `"900"` Los Angeles CA, `"981"` Seattle WA, `"802"` Denver CO, `"331"` Miami FL — plus ~32 more common metros with plausible centroids. Unseeded prefixes resolve to not-found; the estimate endpoint then requires explicit lat/lng (422). Document that the full ~900-prefix table can be dropped in later with no code change.

### 12.4 API contract additions (append to §5)

| Method | Path | Auth | Request | Success (200) | Errors |
|---|---|---|---|---|---|
| POST | `/api/calc/estimate` | none | `{ bedrooms?:'studio'\|'one'\|'two'\|'three'\|'four', total_cuft?:num>0, origin:{lat,lng}\|{zip}, destination:{lat,lng}\|{zip} }` (exactly one of bedrooms/total_cuft) | `{ total_cuft, est_weight_lbs, distance_miles, fuel_cost_usd, cost_low_usd, cost_high_usd, full_service_mid_usd, recommendation:'full_service'\|'diy', recommendation_text, origin:{lat,lng,city?,state?}, destination:{...} }` | 400 (missing/both size inputs, non-positive); 422 `UNRESOLVED_LOCATION` if a zip can't be resolved (message: pass lat/lng or a supported metro) |
| GET | `/api/geo/resolve` | none | `?zip=NNNNN` | `{ found:true, zip, zip3, lat, lng, city, state }` | 400 malformed zip; 200 `{found:false, zip}` if prefix unseeded |
| GET | `/api/catalog/items` | none | — | `{ items:[{key,label,volume_cuft}], bedroom_presets:{ studio:{cuft,items:[key...]}, one:{...}, two:{...}, three:{...}, four:{...} } }` | — |
| GET | `/api/vault/alerts` | Bearer premium | — | `{ alerts:[{ id, timeline_id, task_title, send_at, status, created_at }] }` | 401; 402 |

The existing **POST** `/api/vault/alerts` is unchanged — add `onRequestGet` (list) to the same `functions/api/vault/alerts.js` handler.

### 12.5 Algorithm — anonymous estimate (§6.10)
```
total_cuft     = total_cuft (if given) else BEDROOM_CUFT[bedrooms]
est_weight_lbs = round(total_cuft × 7.0)                         // round-half-up → integer
// resolve each lane endpoint: {zip} → seeded ZIP-3 centroid; else use {lat,lng} as given
distance_miles = round( haversine(origin,dest) × 1.2 , 2)        // reuse §6.4 driving distance
fuel_cost_usd  = round( (distance_miles / 10) × 3.50 , 2)        // reuse §6.4 fuel
full_service_per_lb  = 0.55 + 0.00017 × distance_miles
full_service_mid_usd = round( est_weight_lbs × full_service_per_lb , 2)
cost_low_usd   = round( full_service_mid_usd × 0.85 )            // round → integer dollars
cost_high_usd  = round( full_service_mid_usd × 1.15 )
recommendation = distance_miles ≥ 150 ? 'full_service' : 'diy'
```
This is an intentionally simple, transparent rough estimate for the anonymous top-of-funnel (no fake precision beyond the documented constants). The PREMIUM Relocation Vault still owns detailed multi-scenario modeling, PDF quote normalization, and anomaly detection.

**Hand-computed fixtures (explicit lat/lng so self-contained; driving/fuel reuse §6.4):**
- **Example A:** total_cuft=840, origin (0,0), destination (1,0).
  `distance_miles=82.91`; `fuel=29.02`; `est_weight=round(840×7)=5880`;
  `per_lb=0.55+0.00017×82.91=0.5640947`; `full_service_mid=round(5880×0.5640947,2)=3316.88`;
  `cost_low=round(3316.88×0.85)=2819`; `cost_high=round(3316.88×1.15)=3814`; `recommendation='diy'`.
- **Example B:** total_cuft=1300, origin (0,0), destination (2,0).
  `distance_miles=165.83`; `fuel=58.04`; `est_weight=round(1300×7)=9100`;
  `per_lb=0.55+0.00017×165.83=0.5781911`; `full_service_mid=round(9100×0.5781911,2)=5261.54`;
  `cost_low=round(5261.54×0.85)=4472`; `cost_high=round(5261.54×1.15)=6051`; `recommendation='full_service'`.

### 12.6 Geocode resolve (§6.11)
`zip3 = zip.slice(0,3)`; look up `seed/zip3_centroids.json` (or KV `geo:zip3:<zip3>`). Found → `{found:true, zip, zip3, lat, lng, city, state}`. Not found → `{found:false, zip}` (200). Malformed zip (not 5 digits) → 400.

### 12.7 Catalog (§6.12)
Return `items` from `config:item_volumes` (§4.3) as an array; `bedroom_presets` from `BEDROOM_CUFT`, each with a deterministic sample `items[]` list (catalog keys that roughly sum to the preset cuft). No auth.

### 12.8 File manifest additions (§8)
- `functions/lib/geo.js` (`resolveZip(zip, env)`), `functions/lib/estimate.js` (`computeEstimate(input, env)`; reuses `distance.js`).
- `functions/api/calc/estimate.js`, `functions/api/geo/resolve.js`, `functions/api/catalog/items.js`.
- `functions/api/vault/alerts.js` — add `onRequestGet` (list) beside the existing `onRequestPost`.
- `seed/zip3_centroids.json`. (No new wrangler bindings — geo uses KV/seed.)
- `test/estimate.test.js` (§12.5 fixtures A+B EXACT), `test/geo.test.js` (100→New York, 303→Atlanta, unseeded→`found:false`); extend a test for `GET /api/catalog/items` and the `GET /api/vault/alerts` premium list.

### 12.9 Testing (§9 extension)
Add the estimate/geo/catalog/alert-list tests; the full suite (existing 70 + new) must pass with `npm test`, and the §12.5 estimate fixtures must match exactly.
