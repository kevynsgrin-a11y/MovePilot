// functions/api/vault/alerts.js  →  POST /api/vault/alerts
// SPEC §3 feature 16, §5 (Vault), §2 / §4.4. PREMIUM-gated (requirePremium → 402).
// SMS deadline alerts are TIMED IN D1, NEVER QUEUED (a queue cannot delay a message
// until a days-away send_at; max delivery delay is 12h). The alert is persisted as an
// `alerts` row with status='scheduled' and the future send_at; the companion Worker's
// 15-minute cron scans `alerts WHERE send_at <= now AND status='scheduled'` and
// dispatches due reminders (marking each sent/failed). This endpoint does NOT enqueue.

import { ok, HttpError } from '../../lib/respond.js';
import { readJson } from '../../_middleware.js';
import { requirePremium } from '../../lib/auth.js';
import { getDb, id, now } from '../../lib/db.js';

export async function onRequestPost({ request, env }) {
  const { user } = await requirePremium(request, env); // 401/402 gate
  const body = await readJson(request);

  const taskTitle = typeof body.task_title === 'string' ? body.task_title.trim() : '';
  if (!taskTitle) throw new HttpError('VALIDATION', 'task_title is required.');
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  if (!phone) throw new HttpError('VALIDATION', 'phone is required.');

  // send_at must be a parseable ISO datetime (stored verbatim; the cron compares it to now).
  const sendAtRaw = body.send_at;
  if (typeof sendAtRaw !== 'string' || Number.isNaN(Date.parse(sendAtRaw))) {
    throw new HttpError('VALIDATION', 'send_at must be a valid ISO datetime string.');
  }
  const sendAt = new Date(sendAtRaw).toISOString();

  // timeline_id is optional; when supplied it must belong to this user (else 404-ish 400).
  let timelineId = null;
  if (body.timeline_id != null) {
    const db0 = getDb(env);
    const tl = await db0
      .prepare(`SELECT id FROM timelines WHERE id = ? AND user_id = ?`)
      .bind(String(body.timeline_id), user.id)
      .first();
    if (!tl) throw new HttpError('VALIDATION', 'timeline_id does not reference one of your timelines.');
    timelineId = tl.id;
  }

  const alertId = id();
  const db = getDb(env);
  await db
    .prepare(
      `INSERT INTO alerts (id, user_id, timeline_id, task_title, phone, send_at, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'scheduled', ?)`
    )
    .bind(alertId, user.id, timelineId, taskTitle, phone, sendAt, now())
    .run();

  return ok({ alert_id: alertId, status: 'scheduled' }, 201);
}

// GET /api/vault/alerts — SPEC §12.2 feature 27, §12.4. PREMIUM-gated (402 if not premium).
// Lists the authenticated premium user's scheduled/dispatched alerts (own rows only).
export async function onRequestGet({ request, env }) {
  const { user } = await requirePremium(request, env); // 401/402 gate
  const rows = await getDb(env)
    .prepare(
      `SELECT id, timeline_id, task_title, send_at, status, created_at
         FROM alerts WHERE user_id = ? ORDER BY send_at ASC`
    )
    .bind(user.id)
    .all();
  return ok({ alerts: rows.results || [] });
}
