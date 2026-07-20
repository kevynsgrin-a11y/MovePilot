# SITE FACTORY — Project Memory

This repository is a **Site Factory** pipeline instance: a formalized, 5-agent
Claude Code system for building websites end-to-end (concept → backend →
frontend → verified live URL on Cloudflare Pages). Keep this repo as a master
template — for each new site, clone it, drop the Agent 1 research report into
`docs/research/`, and run `/new-site`.

> **New here?** Read `SETUP.md` for prerequisites, first-time publishing, and the
> per-site quickstart.

---

## The 5-Agent Pipeline

- **AGENT 1 — DEEP RESEARCH** *(external: Gemini Deep Research / GPT Research /
  Claude Research)*. Produces the full research report: site concept, plan of
  attack, competitor analysis (strengths, weaknesses, first impressions,
  features), how we beat them, feature brainstorm, and revenue plan (ads +
  affiliate/partner, sprinkle of paid tier where profitable). Saved to
  `docs/research/` with explicit human approval. **Not built in Claude Code** —
  the pipeline only consumes its output.
- **AGENT 2 — CONCEPT** *(subagent `concept-agent`)*. Ingests the approved
  research report, writes the repo README top-to-bottom, then generates a
  VERBATIM backend build prompt saved to `docs/prompts/backend-build-prompt.md`
  and printed in full.
- **AGENT 3 — BACKEND** *(subagent `backend-agent`)*. Executes the backend
  prompt verbatim. Builds ALL backend files, folders, and docs. Tests and
  verifies every programmatic function and every algorithm/equation for
  accuracy. Updates README. Then generates a VERBATIM frontend build prompt
  saved to `docs/prompts/frontend-build-prompt.md` and printed in full.
- **AGENT 4 — FRONT-END UI** *(external: v0 / Lovable / Replit / Bolt.new /
  Builder.io)*. The frontend prompt is pasted into one of those platforms. They
  are paid-token models, so the prompt must be one-shot complete. The exported
  UI code is brought back and merged by `frontend-integration-agent`.
- **AGENT 5 — VERIFY + DEPLOY** *(subagent `verify-deploy-agent`)*. Scours the
  entire site (backend + integrated frontend), grades it against the
  professional web-development rubric, runs a Self-Check-and-Fix loop until it is
  indistinguishable from a top-firm build, deploys to Cloudflare Pages, confirms
  the URL is actually live, and pings via push notification.

---

## GLOBAL LAWS (binding on the main session and every subagent)

1. **HARD APPROVAL GATES.** Never advance a pipeline stage without an explicit
   message `APPROVED` (or `APPROVED WITH CHANGES: ...`). Present the artifact,
   then stop and wait.
2. **VERBATIM HANDOFFS.** Every handoff prompt is (a) written to `docs/prompts/`
   as a standalone file and (b) printed IN FULL, unabridged. Never summarize a
   handoff prompt.
3. **TOKEN DISCIPLINE.** The frontend prompt targets paid platforms. It must be
   one-shot: zero clarifying questions expected, no backend regeneration, no
   wasted scope.
4. **CLOUDFLARE-NATIVE.** Target runtime is Cloudflare Pages: static assets +
   Pages Functions (`functions/` directory) on the Workers runtime. No Node-only
   APIs in server code. If persistence is needed, prefer D1 (SQL), KV
   (key-value), or R2 (files) and say so explicitly in prompts and docs.
5. **DOCS ALWAYS CURRENT.** Any agent that changes the repo updates `README.md`
   and `PIPELINE.md` before finishing its turn.
6. **SUBAGENT CONTEXT IS EMPTY.** When invoking any subagent, the invocation
   prompt must include every file path, gate status, and decision it needs —
   subagents cannot see the main conversation.

---

## Stages & Gates

| Stage | Name | Owner | Gate to advance |
|-------|------|-------|-----------------|
| 0 | Intake | Human + `/new-site` | **Research APPROVED** |
| 1 | Concept | `concept-agent` | **README + backend prompt APPROVED** |
| 2 | Backend | `backend-agent` | **Backend verified + frontend prompt APPROVED** |
| 3 | External UI build | Human (v0/Lovable/Replit/Bolt/Builder.io) | UI exported & returned |
| 4 | Integration | `frontend-integration-agent` | **Integrated build APPROVED** |
| 5 | Verify + Deploy | `verify-deploy-agent` | **DONE = live URL confirmed + notification sent** |

DONE is reached only when a live `*.pages.dev` URL is independently confirmed and
the completion notification has been sent.

---

## Slash-Command Cheat Sheet

| Command | What it does |
|---------|--------------|
| `/new-site [site-name]` | Stage 0 intake for a fresh clone: set project name, reset `PIPELINE.md`, confirm research approval. |
| `/concept [brainstorm notes]` | Gate-check research APPROVED, then run `concept-agent` (README + backend prompt). |
| `/build-backend` | Gate-check backend prompt APPROVED, then run `backend-agent` (build + verify + frontend prompt). |
| `/frontend-handoff [change notes]` | Regenerate/refresh the frontend build prompt via `backend-agent`. |
| `/integrate-frontend [path-to-exported-code]` | Merge exported UI via `frontend-integration-agent` and wire it to the backend. |
| `/verify-deploy` | Gate-check integration APPROVED, then run `verify-deploy-agent` (audit → fix → deploy → confirm → notify). |
| `/pipeline-status` | Report current stage, blocking gate, and the exact next command. |

---

## Notifications

`bash scripts/notify.sh "<msg>"` is the standard way to ping the owner. It sends
a phone push via **ntfy.sh** and falls back to a desktop notification. Put your
ntfy topic in **`.claude/ntfy-topic`** (gitignored) to receive phone pings, or
export `NTFY_TOPIC` in the environment. Agent 5 fires the explicit `🚀 LIVE`
ping on a confirmed deploy.

> You can add `Stop` / `SubagentStop` hooks in `.claude/settings.json` the same
> way the `Notification` hook is wired if you want a ping after every turn. The
> LIVE ping is fired explicitly by Agent 5 — not by a hook.
