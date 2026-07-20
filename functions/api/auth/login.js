// functions/api/auth/login.js
// SPEC §3 feature 8 + §5 (POST /api/auth/login): verify credentials, mint a token.
// Bad credentials return 401 (never reveal whether the email exists specifically).

import { ok, HttpError } from '../../lib/respond.js';
import { readJson } from '../../_middleware.js';
import { getDb, id, now } from '../../lib/db.js';
import { verifyPassword, mintToken, hashToken } from '../../lib/auth.js';

export async function onRequestPost({ request, env }) {
  const body = await readJson(request);
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!email || !password) {
    throw new HttpError('VALIDATION', 'Email and password are required.');
  }

  const db = getDb(env);
  const emailLower = email.toLowerCase();
  const user = await db
    .prepare(`SELECT * FROM users WHERE email_lower = ?`)
    .bind(emailLower)
    .first();

  // Uniform 401 for unknown email OR wrong password (no user enumeration).
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    throw new HttpError('UNAUTHENTICATED', 'Invalid email or password.');
  }

  const token = mintToken();
  const tokenHash = await hashToken(token, env);
  const sessionId = id();
  const ts = now();
  await db
    .prepare(
      `INSERT INTO sessions (id, token_hash, user_id, created_at, last_seen_at)
       VALUES (?, ?, ?, ?, ?)`
    )
    .bind(sessionId, tokenHash, user.id, ts, ts)
    .run();

  return ok(
    { user_id: user.id, auth_token: token, is_premium: Number(user.is_premium) === 1 },
    200
  );
}
