---
description: Stage 0 intake for a fresh Site Factory clone — set the project name, reset PIPELINE.md, and confirm research approval.
argument-hint: [site-name]
---

You are the main session running **Stage 0 (Intake)** of the Site Factory
pipeline. Do this yourself — no subagent needed.

1. Determine the site name from `$ARGUMENTS`. If empty, ask the owner for the
   site name and the research report filename in `docs/research/`.
2. Slugify the site name and set the project name across the repo:
   - `wrangler.toml` → `name = "<slug>"`
   - `package.json` → `"name": "<slug>"`
3. Confirm a research report exists in `docs/research/` (list the files). If none
   is present, tell the owner to drop the Agent 1 report there as
   `<site>-research.md`, then stop.
4. Reset `PIPELINE.md`: set the `<SITE-NAME>` header, mark Stage 0 In-Progress
   and Stages 1–5 Pending, and set the date to today.
5. Ask the owner to confirm research approval. Per GLOBAL LAW 1, do not advance
   without an explicit `APPROVED`.
6. Report the next step: once research is `APPROVED`, run `/concept`.
