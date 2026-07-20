// functions/api/auth/register.js
// SPEC §3 feature 8 + §5 (POST /api/auth/register): email+password registration.
// Passwords are PBKDF2-hashed via Web Crypto (auth.js) — never stored plaintext (§1).
// Returns an auth token bound to a new authenticated session row.

import { ok, HttpError } from '../../lib/respond.js';
import { readJson } from '../../_middleware.js';
import { getDb, id, now } from '../../lib/db.js';
import { hashPassword, mintToken, hashToken } from '../../lib/auth.js';

// Minimal, deterministic email shape check (no network, no fake precision).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function onRequestPost({ request, env }) {
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

  // 409 if the email already exists (unique email_lower, §4.1).
  const existing = await db
    .prepare(`SELECT id FROM users WHERE email_lower = ?`)
    .bind(emailLower)
    .first();
  if (existing) {
    throw new HttpError('CONFLICT', 'An account with this email already exists.');
  }

  const userId = id();
  const ts = now();
  const passwordHash = await hashPassword(password);

  // Mint the auth token; store only its HMAC hash in the session row.
  const token = mintToken();
  const tokenHash = await hashToken(token, env);
  const sessionId = id();

  await db.batch([
    db
      .prepare(
        `INSERT INTO users (id, email, email_lower, password_hash, is_premium, is_admin, created_at, updated_at)
         VALUES (?, ?, ?, ?, 0, 0, ?, ?)`
      )
      .bind(userId, email, emailLower, passwordHash, ts, ts),
    db
      .prepare(
        `INSERT INTO sessions (id, token_hash, user_id, created_at, last_seen_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind(sessionId, tokenHash, userId, ts, ts),
  ]);

  return ok({ user_id: userId, auth_token: token }, 201);
}
