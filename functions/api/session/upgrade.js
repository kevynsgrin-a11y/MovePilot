// functions/api/session/upgrade.js
// SPEC §3 feature 9 + §4.5 + §5 (POST /api/session/upgrade): anonymous → registered
// with ZERO data loss (§1 principle 4). In one atomic D1 batch:
//   (a) ensure/create the user (register-or-attach),
//   (b) reassign every inventory_states row owned by the anon session to the user,
//   (c) mark the session upgraded and bind it to the user (user_id set).
// No rows are deleted; the count of inventory rows is preserved and reported.

import { ok, HttpError } from '../../lib/respond.js';
import { readJson } from '../../_middleware.js';
import { getSession, verifyPassword, hashPassword } from '../../lib/auth.js';
import { getDb, id, now } from '../../lib/db.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function onRequestPost({ request, env }) {
  const ctx = await getSession(request, env);
  if (!ctx) {
    throw new HttpError('UNAUTHENTICATED', 'A valid session token is required.');
  }
  // 401 if the token is NOT an anonymous session (already bound to a user).
  if (ctx.session.user_id) {
    throw new HttpError('UNAUTHENTICATED', 'This endpoint requires an anonymous session token.');
  }

  const body = await readJson(request);
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!EMAIL_RE.test(email)) {
    throw new HttpError('VALIDATION', 'A valid email is required.');
  }
  if (password.length < 8) {
    throw new HttpError('VALIDATION', 'Password must be at least 8 characters.');
  }

  const db = getDb(env);
  const emailLower = email.toLowerCase();
  const ts = now();
  const sessionId = ctx.session.id;

  // Register-or-attach: if the email exists, the password MUST match (else 409);
  // otherwise create a fresh user.
  const existingUser = await db
    .prepare(`SELECT * FROM users WHERE email_lower = ?`)
    .bind(emailLower)
    .first();

  const statements = [];
  let userId;
  if (existingUser) {
    const okPw = await verifyPassword(password, existingUser.password_hash);
    if (!okPw) {
      throw new HttpError(
        'CONFLICT',
        'An account with this email already exists and the password does not match.'
      );
    }
    userId = existingUser.id;
  } else {
    userId = id();
    const passwordHash = await hashPassword(password);
    statements.push(
      db
        .prepare(
          `INSERT INTO users (id, email, email_lower, password_hash, is_premium, is_admin, created_at, updated_at)
           VALUES (?, ?, ?, ?, 0, 0, ?, ?)`
        )
        .bind(userId, email, emailLower, passwordHash, ts, ts)
    );
  }

  // Count the anon-owned inventory rows BEFORE reassignment so we can assert
  // count-preservation (AC: rows before == rows after, now user-owned).
  const countRow = await db
    .prepare(
      `SELECT COUNT(*) AS c FROM inventory_states WHERE owner_type = 'session' AND owner_id = ?`
    )
    .bind(sessionId)
    .first();
  const migrated = Number(countRow ? countRow.c : 0);

  // (b) reassign inventory ownership session → user.
  statements.push(
    db
      .prepare(
        `UPDATE inventory_states
           SET owner_type = 'user', owner_id = ?, updated_at = ?
         WHERE owner_type = 'session' AND owner_id = ?`
      )
      .bind(userId, ts, sessionId)
  );
  // (c) mark the session upgraded and bind it to the user.
  statements.push(
    db
      .prepare(`UPDATE sessions SET upgraded_to_user_id = ?, user_id = ? WHERE id = ?`)
      .bind(userId, userId, sessionId)
  );

  await db.batch(statements);

  // The presented token now authenticates as the user (session.user_id is set).
  return ok({ user_id: userId, auth_token: ctx.token, inventory_migrated: migrated }, 200);
}
