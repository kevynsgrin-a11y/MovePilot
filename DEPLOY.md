# MovePilot — Cloudflare Deploy Runbook

The whole app (React/Vite frontend + Pages Functions backend + companion Worker)
deploys to **Cloudflare**. Frontend static assets build to `dist/`; the API is
Pages Functions under `functions/`; background jobs run in the companion Worker
(`worker/`). This runbook provisions the data stores, then deploys.

> **Fastest path:** hand me a **Cloudflare API token** (dashboard → My Profile →
> API Tokens → *Create* → "Edit Cloudflare Workers" template, which also covers
> Pages/D1/KV/Queues) and I can run all of this from the build environment and
> confirm the live URL. Otherwise, run it yourself below.

## 0. Prerequisites
```bash
npm install
npx wrangler login          # or: export CLOUDFLARE_API_TOKEN=...
```

## 1. Provision data stores (one-time)
```bash
# D1 (relational)
npx wrangler d1 create movepilot-db
#   → copy the printed database_id into wrangler.toml under [[d1_databases]] (binding "MP_DB")

# KV (cache + static config + FMCSA records)
npx wrangler kv namespace create MP_KV
#   → copy the printed id into wrangler.toml under [[kv_namespaces]] (binding "MP_KV")

# Queue (FMCSA re-ingest)
npx wrangler queues create mp-fmcsa-ingest
```
Add the **same** `MP_DB` + `MP_KV` bindings, the `MP_FMCSA_INGEST` producer, and
(in `worker/wrangler.toml`) the queue **consumer** + `[triggers] crons`, per the
"Two wrangler configs" note in `docs/prompts/backend-build-prompt.md` §8.

## 2. Migrate + seed
```bash
npm run migrate:remote      # applies migrations/*.sql to the remote D1
npm run seed:remote         # loads seed/*.json (item volumes, ZIP-3 centroids, ad slots, ...) into KV
```

## 3. Secrets (all optional — the app runs in fallback/cache-only mode without them)
```bash
npx wrangler pages secret put NCOA_PROVIDER_KEY    # address standardization (Lob/Smarty/Melissa)
npx wrangler pages secret put FMCSA_WEBKEY         # SAFER live queries (else cache-only)
npx wrangler pages secret put SMS_PROVIDER_KEY      # premium SMS alerts
npx wrangler pages secret put ADMIN_API_KEY         # admin console bearer
npx wrangler pages secret put AUTH_TOKEN_SECRET     # HMAC signing key (set a strong random value)
# HIREAHELPER_API_KEY is reserved for a future live-quote integration (v1 = affiliate links only).
```

## 4. Build + deploy the site (Pages)
```bash
npm run build
npx wrangler pages deploy dist --project-name=movepilot
#   → returns the live https://movepilot.pages.dev (or *.pages.dev) URL
```

## 5. Deploy the companion Worker (queue consumer + cron)
```bash
cd worker
npx wrangler deploy         # uses worker/wrangler.toml (D1 + KV + queue consumer + crons)
cd ..
```

## 6. Confirm live
- Homepage returns **HTTP 200** and renders the hero.
- `GET /api/catalog/items`, `GET /api/fmcsa/lookup?usdot=1234567`, and
  `POST /api/calc/estimate` respond correctly.
- The 4 calculators, carrier check, and timeline work against the live API.

## Notes
- Local dev with a working API: `npm run migrate && npm run seed && npm run dev`
  (`wrangler pages dev` serves the built `dist/` + Functions + local D1/KV).
- Frontend-only preview (no backend / inert data): `npm run build && npm run preview`.
- Custom domain (`movepilot.com`): add it in the Cloudflare Pages project → Custom domains.
