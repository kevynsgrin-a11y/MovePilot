// functions/api/admin/ingest/trigger.js  →  POST /api/admin/ingest/trigger
// SPEC §3 feature 23, §5 (Admin), §4.4. Admin-authed (requireAdmin → 401/403).
// Enqueues a batch of USDOT numbers onto the MP_FMCSA_INGEST queue (PRODUCER binding —
// exists on the Pages project) and writes an ingest_log row. The companion Worker hosts
// the consumer that actually refreshes SAFER records into KV (Pages Functions cannot
// host queue consumers, §2). The same batch is also enqueued weekly by the Worker's cron.
// Message body per §4.4: { type:'fmcsa_refresh', usdot, ingest_run_id }.

import { ok, HttpError } from '../../../lib/respond.js';
import { readJson } from '../../../_middleware.js';
import { requireAdmin } from '../../../lib/auth.js';
import { getDb, id, now } from '../../../lib/db.js';

export async function onRequestPost({ request, env }) {
  await requireAdmin(request, env); // 401/403 gate
  const body = await readJson(request);

  const usdots = Array.isArray(body.usdots) ? body.usdots : null;
  if (!usdots || usdots.length === 0) {
    throw new HttpError('VALIDATION', 'usdots must be a non-empty array of USDOT strings.');
  }
  const cleaned = usdots.map((u) => String(u).trim()).filter((u) => u !== '');
  if (cleaned.length === 0) {
    throw new HttpError('VALIDATION', 'usdots must contain at least one non-empty USDOT.');
  }

  const ingestRunId = id();
  const db = getDb(env);
  // Record the run first as 'queued' (the Worker's consumer transitions it as it processes).
  await db
    .prepare(
      `INSERT INTO ingest_log (id, source, run_at, records_processed, errors, status, detail)
       VALUES (?, 'fmcsa_safer', ?, 0, 0, 'queued', ?)`
    )
    .bind(ingestRunId, now(), `Admin-triggered ingest of ${cleaned.length} USDOT number(s).`)
    .run();

  // Enqueue one refresh message per USDOT onto the producer binding.
  if (env && env.MP_FMCSA_INGEST && typeof env.MP_FMCSA_INGEST.send === 'function') {
    for (const usdot of cleaned) {
      await env.MP_FMCSA_INGEST.send({ type: 'fmcsa_refresh', usdot, ingest_run_id: ingestRunId });
    }
  }

  return ok({ ingest_run_id: ingestRunId, enqueued: cleaned.length }, 202);
}
