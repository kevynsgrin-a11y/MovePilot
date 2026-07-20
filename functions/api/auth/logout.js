// functions/api/auth/logout.js
// SPEC §3 feature 8 + §5 (POST /api/auth/logout): revoke the presented bearer's
// session. Works for either an authenticated user token or an anonymous session
// token — any valid, non-revoked session may revoke itself.

import { ok, HttpError } from '../../lib/respond.js';
import { getSession } from '../../lib/auth.js';
import { getDb, now } from '../../lib/db.js';

export async function onRequestPost({ request, env }) {
  const ctx = await getSession(request, env);
  if (!ctx) {
    throw new HttpError('UNAUTHENTICATED', 'A valid session token is required.');
  }
  const db = getDb(env);
  // Soft-revoke: set revoked_at so getSession (which filters revoked_at IS NULL)
  // no longer resolves this token.
  await db
    .prepare(`UPDATE sessions SET revoked_at = ? WHERE id = ?`)
    .bind(now(), ctx.session.id)
    .run();

  return ok({ revoked: true }, 200);
}
