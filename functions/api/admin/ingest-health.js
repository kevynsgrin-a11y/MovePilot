// functions/api/admin/ingest-health.js  →  GET /api/admin/ingest-health?limit=
// SPEC §3 feature 20, §5 (Admin). Admin-authed (requireAdmin → 401/403). Returns the
// latest FMCSA ingest runs (records processed, errors, status, run time) for the
// admin console health view.

import { ok } from '../../lib/respond.js';
import { requireAdmin } from '../../lib/auth.js';
import { getDb } from '../../lib/db.js';

export async function onRequestGet({ request, env }) {
  await requireAdmin(request, env); // 401/403 gate
  const url = new URL(request.url);
  let limit = parseInt(url.searchParams.get('limit') || '20', 10);
  if (!Number.isInteger(limit) || limit <= 0) limit = 20;
  if (limit > 200) limit = 200;

  const db = getDb(env);
  const res = await db
    .prepare(
      `SELECT id, source, run_at, records_processed, errors, status, detail
         FROM ingest_log
        ORDER BY run_at DESC
        LIMIT ?`
    )
    .bind(limit)
    .all();
  return ok({ runs: res.results || [] }, 200);
}
