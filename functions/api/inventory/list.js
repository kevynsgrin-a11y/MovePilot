// functions/api/inventory/list.js
// SPEC §3 feature 10 + §5 (GET /api/inventory/list): list the caller's saved
// inventory states. A registered-user token sees only owner_type='user' rows for
// its user; an anonymous session token sees only its own owner_type='session' rows.

import { ok } from '../../lib/respond.js';
import { getDb } from '../../lib/db.js';
import { resolveOwner } from './save.js';

export async function onRequestGet({ request, env }) {
  const owner = await resolveOwner(request, env);
  const db = getDb(env);
  const res = await db
    .prepare(
      `SELECT id, name, total_cuft, total_cbm, updated_at
         FROM inventory_states
        WHERE owner_type = ? AND owner_id = ?
        ORDER BY updated_at DESC`
    )
    .bind(owner.owner_type, owner.owner_id)
    .all();
  return ok({ items: res.results || [] }, 200);
}
