---
description: Merge exported UI code (from v0/Lovable/Replit/Bolt/Builder.io) into the repo and wire it to the existing backend via frontend-integration-agent.
argument-hint: [path-to-exported-code]
---

**Stage 4 (Integration)** of the Site Factory pipeline.

Invoke the `frontend-integration-agent` subagent with a self-contained prompt
(GLOBAL LAW 6) that includes:

- The export path from `$ARGUMENTS` (or the pasted-code location).
- Pointers to the live API contract: the API reference table in `README.md` and
  the Pages Functions under `functions/`.
- The requirement to kill all mocks/placeholder data, wire every fetch/action to
  the real endpoints, make the build output static assets deployable on
  Cloudflare Pages alongside `functions/`, adjust the `build` script and
  `wrangler.toml` `pages_build_output_dir`, run the build and
  `npx wrangler pages dev`, and preserve the visual work exactly (no redesign,
  no backend rewrite, no dropped features).
- The requirement to update `PIPELINE.md` Stage 4.

Relay the subagent's wiring map (component → endpoint), any resolved mismatches,
and its closing gate line to the owner untouched.
