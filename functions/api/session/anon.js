// functions/api/session/anon.js
// SPEC §3 feature 7 + §5 (POST /api/session/anon): mint an anonymous session token.
// Escrowed-identity principle (§1.1): this works with NO email/phone. The opaque
// bearer token can own inventory_states via owner_type='session'.

import { ok } from '../../lib/respond.js';
import { getDb, id, now } from '../../lib/db.js';
import { mintToken, hashToken } from '../../lib/auth.js';

export async function onRequestPost({ request, env }) {
  const db = getDb(env);
  // Mint an opaque bearer for the client; store only its HMAC hash (auth.js contract).
  const token = mintToken();
  const tokenHash = await hashToken(token, env);
  const sessionId = id();
  const ts = now();
  // Anonymous session => user_id NULL (§4.1: NULL user_id means anonymous).
  await db
    .prepare(
      `INSERT INTO sessions (id, token_hash, user_id, created_at, last_seen_at)
       VALUES (?, ?, NULL, ?, ?)`
    )
    .bind(sessionId, tokenHash, ts, ts)
    .run();

  return ok({ session_token: token, session_id: sessionId }, 201);
}
