---
description: Report the current pipeline stage, the blocking gate, and the exact next command to run.
---

Do this yourself — no subagent. Read `PIPELINE.md`, then inspect the repo to
corroborate actual state:

- Does `docs/research/` contain a report?
- Does `docs/prompts/backend-build-prompt.md` exist? Has the owner said
  `APPROVED` on it?
- Does `functions/` exist (backend built)?
- Does `docs/prompts/frontend-build-prompt.md` exist?
- Has the frontend been integrated (frontend source + build config present)?
- Any last deploy recorded in `PIPELINE.md` (a `*.pages.dev` URL)?

Report exactly three things:

1. **Current stage** (0–5, or DONE).
2. **Blocking gate** — what approval or artifact is required to advance.
3. **Exact next command** to run (e.g. `/concept`, `/build-backend`,
   `/integrate-frontend <path>`, `/verify-deploy`).
