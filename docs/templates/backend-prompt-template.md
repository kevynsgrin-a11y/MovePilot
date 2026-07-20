EXECUTE THIS SPECIFICATION VERBATIM AND COMPLETELY. Ask nothing; if a conflict is found, halt and report it.

> **Backend build prompt template.** `concept-agent` (Agent 2) fills EVERY
> section below — no section may be omitted. The result is saved to
> `docs/prompts/backend-build-prompt.md` and executed verbatim by `backend-agent`
> (Agent 3). Target runtime is Cloudflare Pages + Pages Functions on the Workers
> runtime; no Node-only APIs.

## 1. Project identity & mission
One paragraph: site name, one-line mission, target user, and the single outcome
the backend must make possible.

## 2. Target runtime constraints
- Cloudflare Pages + Pages Functions (`functions/`), Workers runtime only.
- No Node-only APIs (no `fs`, `net`, Node `crypto`/`Buffer` builtins, etc.); use
  Web-standard / Workers runtime equivalents.
- Storage choice **with justification**: D1 (relational SQL), KV (key-value,
  edge-cached), and/or R2 (object/file storage). State which, and why, for each
  data need.

## 3. Complete v1 feature list
Every feature, each with a one-line **acceptance criterion** a test can check.

## 4. Data model
Every entity: fields, types, constraints, relations. Migration plan (SQL for D1)
and seed-data plan. Key layout for KV; bucket/prefix layout for R2.

## 5. API contract
EVERY endpoint, one row each: method, path, auth, request schema (body / query /
headers), response schema (status + body), and error cases (status + shape).

## 6. Business logic & algorithms
Every formula and calculation written out **exactly** (the math), with units and
rounding rules. For each algorithm, provide **2+ hand-computed input→output
examples** to be used as test fixtures.

## 7. Revenue plumbing
- Ad-slot config surface (slot IDs, placement config, enable/disable flags).
- Affiliate link handling (link format, tracking/UTM params, click logging).
- Paid-tier gating flags (what is gated, how the flag is checked server-side).

## 8. File-by-file build manifest
Every file to create, with its path and a one-line purpose. Keep the repo
Cloudflare-Pages-deployable at all times.

## 9. Testing requirements
- Unit tests for every programmatic function.
- Endpoint smoke tests (run under `npx wrangler pages dev`).
- Every equation's test must match the Section 6 hand-computed examples EXACTLY.

## 10. Documentation requirements
- Update `README.md` with an API reference table (method, path, request,
  response, errors).
- Inline comments on all non-obvious logic and every formula.

## 11. Definition of done
- All features meet their acceptance criteria; all tests pass; every endpoint
  smoke-tested live; `README.md` + `PIPELINE.md` updated; frontend build prompt
  generated. Nothing hands off unverified.
