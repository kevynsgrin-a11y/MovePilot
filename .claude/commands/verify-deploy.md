---
description: Gate-check integration APPROVED, then run verify-deploy-agent to audit, self-fix, deploy to Cloudflare Pages, confirm live, and notify.
---

**Stage 5 (Verify + Deploy)** of the Site Factory pipeline.

**GATE CHECK:** Confirm the owner has said `APPROVED` on the integrated build
(Stage 4). If not, refuse and ask for it (GLOBAL LAW 1).

Then invoke the `verify-deploy-agent` subagent with a self-contained prompt
(GLOBAL LAW 6) that includes:

- The rubric path `docs/templates/grading-rubric.md` (score every category
  0–100 with file/line evidence; deploy threshold = weighted total ≥ 90 AND no
  category < 80; Self-Check-and-Fix loop up to 3 passes).
- The Cloudflare Pages project name from `wrangler.toml` (`name = ...`) and the
  build output dir (`pages_build_output_dir`).
- The notify script path `scripts/notify.sh` for the final `🚀 LIVE` ping.
- The order of operations: audit → self-fix → `npm run build` (if applicable) →
  `npx wrangler pages deploy` → independently confirm the live `*.pages.dev` URL
  (HTTP 200, correct `<title>`, key routes) → notify → update `PIPELINE.md` to
  DONE. Never notify before the live check passes.

Relay the subagent's final grade table, fix log, live URL, and confirmation
evidence to the owner.
