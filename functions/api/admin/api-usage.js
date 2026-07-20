// functions/api/admin/api-usage.js  →  GET /api/admin/api-usage?from=&to=
// SPEC §3 feature 21, §5 (Admin), §4.1 api_usage. Admin-authed (requireAdmin → 401/403).
// Returns per-provider call counts + estimated cost (cents) for a date range, plus
// aggregate totals for the admin cost-monitoring view.

import { ok } from '../../lib/respond.js';
import { requireAdmin } from '../../lib/auth.js';
import { getDb, today } from '../../lib/db.js';

export async function onRequestGet({ request, env }) {
  await requireAdmin(request, env); // 401/403 gate
  const url = new URL(request.url);
  // Default range: a wide window if unspecified (epoch → today).
  const from = url.searchParams.get('from') || '0000-01-01';
  const to = url.searchParams.get('to') || today();

  const db = getDb(env);
  const res = await db
    .prepare(
      `SELECT provider, day, calls, cost_cents
         FROM api_usage
        WHERE day >= ? AND day <= ?
        ORDER BY day DESC, provider ASC`
    )
    .bind(from, to)
    .all();
  const usage = res.results || [];

  // Aggregate totals overall and per-provider.
  const totals = { calls: 0, cost_cents: 0, by_provider: {} };
  for (const r of usage) {
    totals.calls += r.calls;
    totals.cost_cents += r.cost_cents;
    if (!totals.by_provider[r.provider]) totals.by_provider[r.provider] = { calls: 0, cost_cents: 0 };
    totals.by_provider[r.provider].calls += r.calls;
    totals.by_provider[r.provider].cost_cents += r.cost_cents;
  }

  return ok({ usage, totals, range: { from, to } }, 200);
}
