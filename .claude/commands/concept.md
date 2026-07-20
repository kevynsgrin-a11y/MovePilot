---
description: Gate-check research APPROVED, then run concept-agent to write the README and the verbatim backend build prompt.
argument-hint: [optional brainstorm notes]
---

**Stage 1 (Concept)** of the Site Factory pipeline.

**GATE CHECK:** Confirm the owner has said `APPROVED` on the research report in
`docs/research/`. If approval has not been given in this conversation, refuse and
ask for it (GLOBAL LAW 1). Do not proceed otherwise.

Then invoke the `concept-agent` subagent with a fully self-contained prompt
(subagents start with empty context — GLOBAL LAW 6). The prompt MUST include:

- The exact path to the approved research report in `docs/research/`.
- Any human brainstorm notes provided here: `$ARGUMENTS`.
- The template path `docs/templates/backend-prompt-template.md` to follow
  section-for-section.
- The instruction to overwrite `README.md` and write
  `docs/prompts/backend-build-prompt.md`, then print the backend prompt IN FULL.

Relay the subagent's full output to the owner UNTOUCHED — including the complete
backend prompt and its closing gate line. Do not summarize it (GLOBAL LAW 2).
