# Cloudflare domain edge

The full-stack MovePilot application is deployed to Cloudflare Pages at
`movepilot.pages.dev`. This Worker attaches the Cloudflare-managed
`relocationstation.app` zone to that deployment while keeping
`https://relocationstation.app` as the canonical URL.

Deploy from the repository root:

```sh
npx wrangler deploy --config cloudflare/wrangler.jsonc
```

Cloudflare Custom Domains create the DNS records and TLS certificates for the
apex and `www` hosts. Requests to `www` are permanently redirected to the apex.
Direct visits to client-side routes receive the app shell when the upstream
returns a 404.

## Backend bindings

The Pages Functions deployment is bound to the production `movepilot-db` D1
database, `movepilot-MP_KV` namespace, and `mp-fmcsa-ingest` Queue producer. The
separate `movepilot-worker` deployment consumes that Queue and runs the weekly
FMCSA refresh and 15-minute alert-dispatch schedules.
