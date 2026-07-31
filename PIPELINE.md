# Pipeline Status — MovePilot

> Privacy-first relocation orchestration utility. Frontend (React/Vite) + Cloudflare
> Pages Functions backend + companion Worker, in one deployable repo.

**Current stage:** Stage 5 — Verify + Deploy complete
**Blocking gate:** None
**Last updated:** 2026-07-31

| Stage | Owner | Gate | Status | Artifact |
|-------|-------|------|--------|----------|
| 0 — Intake | Human + `/new-site` | Research APPROVED | ✅ Complete | `docs/research/movepilot-research.md` |
| 1 — Concept | concept-agent | README + backend prompt APPROVED | ✅ Complete | `README.md`, `docs/prompts/backend-build-prompt.md` |
| 2 — Backend | backend-agent | Backend verified + frontend prompt APPROVED | ✅ Complete | `functions/`, `worker/`, `docs/prompts/frontend-build-prompt.md` |
| 2.5 — Design blueprint | design fleet | Blueprint drives the frontend | ✅ Complete | `docs/design/visual-blueprint.md`, `docs/design/hero-preview.html` |
| 3 — UI build | Owner chose "build in-house" | UI built | ✅ Complete | `src/` (18 pages, React/Vite/Tailwind) |
| 4 — Integration | (in-house) | Wired to the real API | ✅ Complete | frontend bound to `/api/*`, one Cloudflare-Pages repo |
| 5 — Verify + Deploy | verify-deploy-agent | Live URL confirmed + notification | ✅ Complete — frontend, API, storage, Queue, and crons live | `https://relocationstation.app` |

## Build evidence (verified with real runs)
- **`npm run build`** exits 0 → `dist/index.html` + hashed JS/CSS + `_redirects` + favicon.
- **`npm test`** (Vitest) → **84/84** passing across 14 files.
- 18 pages / 19 routes wired in `src/routes.tsx` + `App.tsx`; SPA `_redirects` present.
- **Zero mock data**: all data flows through `src/lib/api.ts`; the anonymous hero/estimator calls `POST /api/calc/estimate` (never any `/api/vault/*`); "sample data" appears only inside labeled 402 premium-gate previews.
- Backend intact: 33 endpoint route files (full documented API surface — several serve multiple HTTP methods), 17 shared libs, the companion Worker (queue consumer + cron), migrations + seed.

## Post-launch integrations

Core production deployment is complete. Optional third-party provider secrets
(`NCOA_PROVIDER_KEY`, `FMCSA_WEBKEY`, and `SMS_PROVIDER_KEY`) can be added later
to replace the documented deterministic/cache-only/no-op fallbacks. See
**`DEPLOY.md`** for the resource inventory and redeploy commands.
