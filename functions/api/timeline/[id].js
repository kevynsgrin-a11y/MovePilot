// functions/api/timeline/[id].js  →  GET /api/timeline/:id
// SPEC §3 feature 11, §5 (Timeline). Bearer (registered user) required. Returns a
// stored timeline scoped to the caller; a row not owned by the user resolves to 404
// (ownership is never disclosed).

import { ok, errorResponse, HttpError } from '../../lib/respond.js';
import { requireUser } from '../../lib/auth.js';
import { getDb } from '../../lib/db.js';

export async function onRequestGet(context) {
  try {
    const { request, env, params } = context;
    const { user } = await requireUser(request, env); // 401 if not a registered user

    const db = getDb(env);
    const row = await db
      .prepare(`SELECT * FROM timelines WHERE id = ? AND user_id = ?`)
      .bind(params.id, user.id)
      .first();
    if (!row) throw new HttpError('NOT_FOUND', 'Timeline not found.');

    return ok({
      id: row.id,
      move_date: row.move_date,
      origin: row.origin,
      destination: row.destination,
      tasks: JSON.parse(row.tasks_json),
      created_at: row.created_at,
    });
  } catch (e) {
    return errorResponse(e);
  }
}
