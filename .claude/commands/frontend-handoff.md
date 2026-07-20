---
description: Regenerate or refresh docs/prompts/frontend-build-prompt.md via backend-agent (useful after backend tweaks).
argument-hint: [change notes]
---

Refresh the **frontend build prompt** only (no rebuild of the backend).

Invoke the `backend-agent` subagent with a self-contained prompt (GLOBAL LAW 6)
that includes:

- The current backend state and API contract (point it at `README.md` and
  `functions/`).
- The change notes to fold in: `$ARGUMENTS`.
- The template path `docs/templates/frontend-prompt-template.md`.
- The instruction to regenerate `docs/prompts/frontend-build-prompt.md` as a
  one-shot, paid-platform-ready prompt (GLOBAL LAW 3) and print it IN FULL —
  never summarized (GLOBAL LAW 2).

Relay the full regenerated frontend prompt to the owner untouched.
