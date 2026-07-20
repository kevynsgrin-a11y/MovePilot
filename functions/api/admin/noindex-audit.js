// functions/api/admin/noindex-audit.js  →  GET /api/admin/noindex-audit
// SPEC §3 feature 22, §5 (Admin). Admin-authed (requireAdmin → 401/403). Returns every
// route row with its noindex flag + reason (e.g. zero authorized carriers) and the
// carrier counts, so an admin can audit SEO suppression.

import { ok } from '../../lib/respond.js';
import { requireAdmin } from '../../lib/auth.js';
import { getDb } from '../../lib/db.js';

export async function onRequestGet({ request, env }) {
  await requireAdmin(request, env); // 401/403 gate
  const db = getDb(env);
  const res = await db
    .prepare(
      `SELECT id, noindex, noindex_reason, origin_carrier_count, dest_carrier_count
         FROM route_pages
        ORDER BY id ASC`
    )
    .all();
  const routes = (res.results || []).map((r) => ({
    id: r.id,
    noindex: Number(r.noindex) === 1,
    noindex_reason: r.noindex_reason,
    origin_carrier_count: r.origin_carrier_count,
    dest_carrier_count: r.dest_carrier_count,
  }));
  return ok({ routes }, 200);
}
