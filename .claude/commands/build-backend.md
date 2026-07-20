---
description: Gate-check the backend prompt APPROVED, then run backend-agent to build + verify the backend and produce the verbatim frontend prompt.
---

**Stage 2 (Backend)** of the Site Factory pipeline.

**GATE CHECK:** Confirm the owner has said `APPROVED` on
`docs/prompts/backend-build-prompt.md`. If not, refuse and ask for it
(GLOBAL LAW 1).

Then invoke the `backend-agent` subagent with a self-contained prompt
(GLOBAL LAW 6) that includes:

- The path `docs/prompts/backend-build-prompt.md` and the instruction to execute
  it VERBATIM and completely; if a conflict is found, halt and report it.
- The requirement to build all backend files under `functions/` (Workers
  runtime, no Node-only APIs), write + run tests proving every function and
  algorithm/equation is correct against hand-computed cases, and smoke-test
  endpoints with `npx wrangler pages dev`.
- The requirement to update `README.md` (API reference table) and `PIPELINE.md`
  Stage 2, then write `docs/prompts/frontend-build-prompt.md` per
  `docs/templates/frontend-prompt-template.md` and print it IN FULL.

Relay the subagent's full output UNTOUCHED, including the complete frontend
prompt and its closing gate line (GLOBAL LAW 2).
