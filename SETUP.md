# Site Factory — Setup & Usage

This repo is a **Site Factory**: a 5-agent Claude Code pipeline that builds a
website end-to-end (concept → backend → frontend → verified live URL on
Cloudflare Pages). Keep it as a **master template** — clone it once per new site.

See `CLAUDE.md` for the global laws, the stage/gate map, and the slash-command
cheat sheet. This file is the practical get-started guide.

---

## Prerequisites (one-time, per machine)

1. **Git** — https://git-scm.com/download/win (Windows: includes *Git Bash*,
   the recommended shell since `scripts/notify.sh` is a bash script). macOS/Linux
   use the built-in Terminal.
2. **Node.js LTS** — https://nodejs.org (needed for `npx wrangler`).
3. **Claude Code** — `npm install -g @anthropic-ai/claude-code`.
4. **Cloudflare auth** (before your first deploy) — `npx wrangler login`.

---

## One-time: publish this template to your own GitHub

Do this once so future sites just clone it. In **Git Bash** (Windows) or a
terminal, from the extracted template folder:

1. Create an **empty** repo at https://github.com/new — name it
   `site-factory-template`, set **Private**, and do **NOT** add a
   README/.gitignore/license.
2. Then run:

   ```bash
   git init
   git branch -M main
   git add .
   git commit -m "Initial commit: Site Factory pipeline scaffold"
   git remote add origin https://github.com/<your-user>/site-factory-template.git
   git push -u origin main
   ```

   > GitHub CLI shortcut (does both steps): `gh repo create site-factory-template
   > --private --source=. --remote=origin --push`

---

## Per new site: run the pipeline

```
1. Clone the template:      git clone <your-template-url> my-site && cd my-site
2. Drop the Agent 1 report: put <site>-research.md into docs/research/
3. Start Claude Code:       claude       (subagents + hooks load on a fresh clone)

   /new-site <name>   →  reply  APPROVED   (approving the research report)
   /concept           →  review README + backend prompt  →  APPROVED
   /build-backend     →  review backend + frontend prompt →  APPROVED
   → paste the frontend prompt into v0 / Lovable / Replit / Bolt / Builder.io,
     then export the finished UI code
   /integrate-frontend <path-to-export>   →  APPROVED
   /verify-deploy     →  wait for the 🚀 LIVE ping
```

`/pipeline-status` at any time reports the current stage, the blocking gate, and
the exact next command. `/frontend-handoff <notes>` regenerates the frontend
prompt after backend tweaks.

**Approval gates are hard** (GLOBAL LAW 1): each agent presents its artifact and
stops. Nothing advances until you reply `APPROVED` (or
`APPROVED WITH CHANGES: ...`).

---

## Notifications (optional but recommended)

`scripts/notify.sh` sends a phone push via **ntfy.sh** with a desktop fallback.
To receive phone pings:

- Put your topic in **`.claude/ntfy-topic`** (gitignored), e.g.
  `echo "my-secret-topic-name" > .claude/ntfy-topic`, **or** export
  `NTFY_TOPIC` in your environment.
- Subscribe to that topic in the ntfy app (https://ntfy.sh) on your phone.

Until a topic is set, pushes are simply skipped; the desktop notification and the
console `[notify] ...` line still fire. Agent 5 sends the explicit `🚀 LIVE`
ping once a deploy is confirmed live.

---

## Placeholders to expect

| Placeholder | Where | Resolved by |
|---|---|---|
| `site-factory-template` (project name) | `package.json`, `wrangler.toml` | `/new-site` renames it per site |
| `<SITE-NAME>` | `README.md`, `PIPELINE.md` | `/new-site` and `concept-agent` |
| ntfy topic (unset) | `.claude/ntfy-topic` | you, when you want phone pings |
| `compatibility_date` | `wrangler.toml` | today's date at scaffold time; bump anytime |

---

## Local dev & deploy

```bash
npm install
npm run preview   # wrangler pages dev  (local Pages + Functions)
npm run deploy    # wrangler pages deploy
```
