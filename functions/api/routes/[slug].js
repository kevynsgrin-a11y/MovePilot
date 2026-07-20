// functions/api/routes/[slug].js  →  GET /api/routes/:slug
// SPEC §3 feature 17, §5 (Routes). No auth. slug is a route_pages.id like
// "chicago-il_austin-tx". Returns distance, fuel cost, and the seed-provided
// FMCSA-authorized carrier counts for the origin/destination states; a route whose
// combined carrier count is 0 is flagged noindex=true (§4.2 seed). Unknown slug → 404.

import { ok, HttpError } from '../../lib/respond.js';
import { getDb } from '../../lib/db.js';

export async function onRequestGet({ env, params }) {
  const db = getDb(env);
  const row = await db.prepare(`SELECT * FROM route_pages WHERE id = ?`).bind(params.slug).first();
  if (!row) throw new HttpError('NOT_FOUND', 'Route not found.');
  return ok(
    {
      origin: { city: row.origin_city, state: row.origin_state, lat: row.origin_lat, lng: row.origin_lng },
      destination: { city: row.dest_city, state: row.dest_state, lat: row.dest_lat, lng: row.dest_lng },
      distance_miles: row.distance_miles,
      fuel_cost_usd: row.fuel_cost_usd,
      origin_carrier_count: row.origin_carrier_count,
      dest_carrier_count: row.dest_carrier_count,
      noindex: Number(row.noindex) === 1,
      noindex_reason: row.noindex_reason,
    },
    200
  );
}
