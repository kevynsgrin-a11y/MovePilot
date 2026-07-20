// functions/api/timeline/generate.js  →  POST /api/timeline/generate
// SPEC §3 feature 11, §5 (Timeline), §6.7. Bearer (registered user) required.
// Generates the dated week-by-week task list from the fixed template and persists it
// to `timelines`. Server date (new Date()) is the "today" reference for overdue flags.

import { ok, errorResponse, HttpError } from '../../lib/respond.js';
import { readJson } from '../../_middleware.js';
import { requireUser } from '../../lib/auth.js';
import { generateTimeline } from '../../lib/timeline.js';
import { getDb, id, now } from '../../lib/db.js';

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const { user } = await requireUser(request, env); // 401 if not a registered user
    const body = await readJson(request);

    const move_date = body && body.move_date;
    // generateTimeline throws VALIDATION on unparseable / past date (§6.7).
    const { tasks } = generateTimeline(move_date, new Date());

    const origin = typeof body.origin === 'string' ? body.origin : null;
    const destination = typeof body.destination === 'string' ? body.destination : null;

    const db = getDb(env);
    const timelineId = id();
    const ts = now();
    await db
      .prepare(
        `INSERT INTO timelines (id, user_id, move_date, origin, destination, tasks_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(timelineId, user.id, move_date, origin, destination, JSON.stringify(tasks), ts)
      .run();

    return ok({ id: timelineId, move_date, tasks }, 201);
  } catch (e) {
    return errorResponse(e);
  }
}
