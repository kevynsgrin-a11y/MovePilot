// functions/lib/auth.js
// Auth primitives — Cloudflare Workers runtime ONLY (Web Crypto, no Node crypto).
//   • Passwords: PBKDF2-SHA256 (never stored plaintext). Stored format:
//        "pbkdf2$<iterations>$<saltB64>$<hashB64>"
//   • Bearer tokens: an opaque random token is minted for the client; the DB stores
//        only hashToken(token) = HMAC-SHA256(token, AUTH_TOKEN_SECRET) in
//        sessions.token_hash so a DB leak cannot reveal usable tokens.
//   • Session/auth resolution: getSession → requireUser → requirePremium / requireAdmin.

import { PBKDF2_ITERATIONS, PBKDF2_KEYLEN_BITS } from './constants.js';
import { HttpError } from './respond.js';
import { getDb, now } from './db.js';

// ---------- base64 helpers (no Node Buffer) ----------
function bytesToB64(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
function b64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function bytesToB64Url(bytes) {
  return bytesToB64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function bytesToHex(bytes) {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, '0');
  return hex;
}
const enc = new TextEncoder();

// ---------- passwords (PBKDF2) ----------

async function pbkdf2Bits(password, saltBytes, iterations, bits) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBytes, iterations, hash: 'SHA-256' },
    keyMaterial,
    bits
  );
  return new Uint8Array(derived);
}

/**
 * Hash a plaintext password. @param {string} password
 * @param {number} [iterations=PBKDF2_ITERATIONS]
 * @returns {Promise<string>} "pbkdf2$<iterations>$<saltB64>$<hashB64>"
 */
export async function hashPassword(password, iterations = PBKDF2_ITERATIONS) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2Bits(password, salt, iterations, PBKDF2_KEYLEN_BITS);
  return `pbkdf2$${iterations}$${bytesToB64(salt)}$${bytesToB64(hash)}`;
}

/**
 * Verify a plaintext password against a stored hash (constant-time compare).
 * @param {string} password @param {string} stored
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(password, stored) {
  if (typeof stored !== 'string') return false;
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
  const iterations = parseInt(parts[1], 10);
  const salt = b64ToBytes(parts[2]);
  const expected = b64ToBytes(parts[3]);
  const actual = await pbkdf2Bits(password, salt, iterations, expected.length * 8);
  return timingSafeEqual(actual, expected);
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

// ---------- bearer tokens (opaque + HMAC-SHA256 hash) ----------

/**
 * Mint a new opaque bearer token. @returns {string} 256-bit base64url token
 */
export function mintToken() {
  const raw = crypto.getRandomValues(new Uint8Array(32));
  return bytesToB64Url(raw);
}

/**
 * Compute the DB-stored hash of a bearer token: HMAC-SHA256(token, AUTH_TOKEN_SECRET),
 * hex-encoded. Falls back to a fixed dev key if AUTH_TOKEN_SECRET is unset.
 * @param {string} token @param {object} env @returns {Promise<string>} hex
 */
export async function hashToken(token, env) {
  const secret = (env && env.AUTH_TOKEN_SECRET) || 'movepilot-dev-token-secret';
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(token));
  return bytesToHex(new Uint8Array(sig));
}

// ---------- request auth resolution ----------

/**
 * Extract the raw bearer token from a request Authorization header.
 * @param {Request} request @returns {string|null}
 */
export function getBearer(request) {
  const h = request.headers.get('Authorization') || request.headers.get('authorization');
  if (!h) return null;
  const m = /^Bearer\s+(.+)$/i.exec(h.trim());
  return m ? m[1].trim() : null;
}

/**
 * Resolve the bearer token to its session (and user, if the session is
 * authenticated). Updates last_seen_at. Returns null when there is no valid,
 * non-revoked session.
 * @param {Request} request @param {object} env
 * @returns {Promise<{token:string, tokenHash:string, session:object, user:object|null}|null>}
 */
export async function getSession(request, env) {
  const token = getBearer(request);
  if (!token) return null;
  const tokenHash = await hashToken(token, env);
  const db = getDb(env);
  const session = await db
    .prepare(`SELECT * FROM sessions WHERE token_hash = ? AND revoked_at IS NULL`)
    .bind(tokenHash)
    .first();
  if (!session) return null;

  let user = null;
  if (session.user_id) {
    user = await db.prepare(`SELECT * FROM users WHERE id = ?`).bind(session.user_id).first();
  }
  // best-effort touch of last_seen_at
  await db
    .prepare(`UPDATE sessions SET last_seen_at = ? WHERE id = ?`)
    .bind(now(), session.id)
    .run();
  return { token, tokenHash, session, user };
}

/**
 * Require a valid session that belongs to a REGISTERED user.
 * @param {Request} request @param {object} env
 * @returns {Promise<{session:object, user:object, token:string, tokenHash:string}>}
 * @throws {HttpError} 401 UNAUTHENTICATED
 */
export async function requireUser(request, env) {
  const ctx = await getSession(request, env);
  if (!ctx || !ctx.user) {
    throw new HttpError('UNAUTHENTICATED', 'Valid user authentication is required.');
  }
  return ctx;
}

/**
 * Require a valid session whose user is premium (is_premium===1).
 * @param {Request} request @param {object} env
 * @returns {Promise<{session:object, user:object, token:string, tokenHash:string}>}
 * @throws {HttpError} 401 UNAUTHENTICATED / 402 PREMIUM_REQUIRED
 */
export async function requirePremium(request, env) {
  const ctx = await requireUser(request, env);
  if (Number(ctx.user.is_premium) !== 1) {
    throw new HttpError('PREMIUM_REQUIRED', 'This feature requires a MovePilot Premium pass.');
  }
  return ctx;
}

/**
 * Require admin authorization: the bearer equals env.ADMIN_API_KEY, OR the bearer
 * resolves to a user with is_admin=1.
 * @param {Request} request @param {object} env
 * @returns {Promise<{via:'api_key'|'user', user:object|null}>}
 * @throws {HttpError} 401 UNAUTHENTICATED / 403 FORBIDDEN
 */
export async function requireAdmin(request, env) {
  const token = getBearer(request);
  if (!token) throw new HttpError('UNAUTHENTICATED', 'Admin authentication is required.');
  // Path 1: static admin API key.
  if (env && env.ADMIN_API_KEY && token === env.ADMIN_API_KEY) {
    return { via: 'api_key', user: null };
  }
  // Path 2: an authenticated user carrying is_admin=1.
  const ctx = await getSession(request, env);
  if (ctx && ctx.user && Number(ctx.user.is_admin) === 1) {
    return { via: 'user', user: ctx.user };
  }
  // A recognized non-admin identity is forbidden; anything else is unauthenticated.
  if (ctx && ctx.user) throw new HttpError('FORBIDDEN', 'Admin privileges are required.');
  throw new HttpError('FORBIDDEN', 'Admin privileges are required.');
}
