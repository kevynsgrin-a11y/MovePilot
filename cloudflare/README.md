# Cloudflare domain edge

The public MovePilot interface is deployed by v0/Vercel at
`movepilot-theta.vercel.app`. This Worker attaches the Cloudflare-managed
`relocationstation.app` zone to that deployment while keeping
`https://relocationstation.app` as the canonical URL.

Deploy from the repository root:

```sh
npx wrangler deploy --config cloudflare/wrangler.jsonc
```

Cloudflare Custom Domains create the DNS records and TLS certificates for the
apex and `www` hosts. Requests to `www` are permanently redirected to the apex.
Direct visits to client-side routes receive the Vercel app shell when the
static origin returns a 404.

## Current origin limitation

The v0/Vercel deployment currently serves the static interface but returns 404
for `/api/*`. The edge Worker deliberately preserves those API responses rather
than substituting data. Provision and deploy the repository's Cloudflare Pages
Functions, D1, KV, and Queue bindings to activate the documented calculators,
accounts, timelines, and vault workflows.
