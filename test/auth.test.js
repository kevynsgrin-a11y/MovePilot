// test/auth.test.js
// SPEC §9: unit tests for the accounts slice.
//   1. PBKDF2 hashPassword/verifyPassword round-trip (Web Crypto; §3 feature 8).
//   2. Bearer token mint/verify (mintToken + hashToken HMAC determinism).
//   3. Anonymous → registered upgrade preserves inventory row count (§4.5 / feature 9)
//      exercised against the REAL upgrade handler with an in-memory D1 fake.

import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, mintToken, hashToken } from '../functions/lib/auth.js';
import { onRequestPost as upgrade } from '../functions/api/session/upgrade.js';

const ENV = { AUTH_TOKEN_SECRET: 'test-secret-key' };

// ---------------------------------------------------------------------------
// 1. PBKDF2 password hashing
// ---------------------------------------------------------------------------
describe('password hashing (PBKDF2 / Web Crypto)', () => {
  it('produces the documented storage format and verifies the correct password', async () => {
    const stored = await hashPassword('Correct horse battery staple');
    // Format: "pbkdf2$<iterations>$<saltB64>$<hashB64>" (§4.1 / lib/auth.js).
    const parts = stored.split('$');
    expect(parts).toHaveLength(4);
    expect(parts[0]).toBe('pbkdf2');
    expect(Number(parts[1])).toBeGreaterThan(0);
    expect(await verifyPassword('Correct horse battery staple', stored)).toBe(true);
  });

  it('rejects a wrong password and never stores plaintext', async () => {
    const stored = await hashPassword('ChangeMe!Admin1');
    expect(await verifyPassword('wrong-password', stored)).toBe(false);
    expect(stored).not.toContain('ChangeMe!Admin1');
  });

  it('uses a random salt so identical passwords hash differently', async () => {
    const a = await hashPassword('samePassword123');
    const b = await hashPassword('samePassword123');
    expect(a).not.toBe(b);
    // ...yet each still verifies its own password.
    expect(await verifyPassword('samePassword123', a)).toBe(true);
    expect(await verifyPassword('samePassword123', b)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 2. Bearer token mint / hash
// ---------------------------------------------------------------------------
describe('bearer token mint & hash', () => {
  it('mints distinct opaque base64url tokens', () => {
    const t1 = mintToken();
    const t2 = mintToken();
    expect(t1).not.toBe(t2);
    // base64url: no +, /, or = padding.
    expect(t1).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(t1.length).toBeGreaterThanOrEqual(40);
  });

  it('hashToken is deterministic per (token, secret) and hides the token', async () => {
    const token = mintToken();
    const h1 = await hashToken(token, ENV);
    const h2 = await hashToken(token, ENV);
    expect(h1).toBe(h2); // deterministic HMAC
    expect(h1).toMatch(/^[0-9a-f]{64}$/); // SHA-256 hex
    expect(h1).not.toContain(token); // stored hash never contains the raw token
  });

  it('different tokens and different secrets produce different hashes', async () => {
    const token = mintToken();
    const hA = await hashToken(token, ENV);
    const hB = await hashToken(mintToken(), ENV);
    const hC = await hashToken(token, { AUTH_TOKEN_SECRET: 'other-secret' });
    expect(hA).not.toBe(hB);
    expect(hA).not.toBe(hC);
  });
});

// ---------------------------------------------------------------------------
// 3. Anonymous → registered upgrade preserves inventory row count (§4.5)
// ---------------------------------------------------------------------------

// Minimal in-memory D1 fake: dispatches on the exact SQL the accounts handlers use.
function makeFakeD1(state) {
  function exec(sql, params) {
    if (sql.includes('FROM sessions WHERE token_hash')) {
      return state.sessions.find((s) => s.token_hash === params[0] && s.revoked_at == null) || null;
    }
    if (sql.includes('FROM users WHERE id')) {
      return state.users.find((u) => u.id === params[0]) || null;
    }
    if (sql.includes('UPDATE sessions SET last_seen_at')) {
      const s = state.sessions.find((x) => x.id === params[1]);
      if (s) s.last_seen_at = params[0];
      return { meta: {} };
    }
    if (sql.includes('FROM users WHERE email_lower')) {
      return state.users.find((u) => u.email_lower === params[0]) || null;
    }
    if (sql.includes('COUNT(*) AS c FROM inventory_states')) {
      const c = state.inventory_states.filter(
        (r) => r.owner_type === 'session' && r.owner_id === params[0]
      ).length;
      return { c };
    }
    if (sql.includes('INSERT INTO users')) {
      state.users.push({
        id: params[0],
        email: params[1],
        email_lower: params[2],
        password_hash: params[3],
        is_premium: 0,
        is_admin: 0,
        created_at: params[4],
        updated_at: params[5],
      });
      return { meta: { changes: 1 } };
    }
    if (sql.includes('UPDATE inventory_states')) {
      // params: userId, ts, sessionId
      let changes = 0;
      for (const r of state.inventory_states) {
        if (r.owner_type === 'session' && r.owner_id === params[2]) {
          r.owner_type = 'user';
          r.owner_id = params[0];
          r.updated_at = params[1];
          changes++;
        }
      }
      return { meta: { changes } };
    }
    if (sql.includes('UPDATE sessions SET upgraded_to_user_id')) {
      const s = state.sessions.find((x) => x.id === params[2]);
      if (s) {
        s.upgraded_to_user_id = params[0];
        s.user_id = params[1];
      }
      return { meta: { changes: 1 } };
    }
    throw new Error('unmocked SQL: ' + sql);
  }
  function prepare(sql) {
    let bound = [];
    const api = {
      bind(...p) {
        bound = p;
        return api;
      },
      async first() {
        return exec(sql, bound);
      },
      async run() {
        return exec(sql, bound);
      },
      async all() {
        const r = exec(sql, bound);
        return { results: Array.isArray(r) ? r : [] };
      },
    };
    return api;
  }
  return {
    prepare,
    async batch(stmts) {
      const out = [];
      for (const s of stmts) out.push(await s.run());
      return out;
    },
  };
}

describe('anonymous → registered upgrade (§4.5)', () => {
  it('reassigns every anon-owned inventory row to the new user with zero rows lost', async () => {
    const token = mintToken();
    const tokenHash = await hashToken(token, ENV);
    const state = {
      users: [],
      sessions: [
        {
          id: 'sess-1',
          token_hash: tokenHash,
          user_id: null,
          upgraded_to_user_id: null,
          revoked_at: null,
          last_seen_at: '2026-01-01T00:00:00.000Z',
        },
      ],
      // Three inventory states owned by the anonymous session.
      inventory_states: [
        { id: 'inv-1', owner_type: 'session', owner_id: 'sess-1', total_cuft: 46.5 },
        { id: 'inv-2', owner_type: 'session', owner_id: 'sess-1', total_cuft: 96.0 },
        { id: 'inv-3', owner_type: 'session', owner_id: 'sess-1', total_cuft: 125.0 },
      ],
    };
    const env = { ...ENV, MP_DB: makeFakeD1(state) };

    const before = state.inventory_states.length;

    const request = new Request('http://local/api/session/upgrade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ email: 'mover@example.com', password: 'password123' }),
    });
    const response = await upgrade({ request, env });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    // Row count reported migrated == count before.
    expect(payload.data.inventory_migrated).toBe(before);

    const userId = payload.data.user_id;
    // Zero rows lost, and every row now owned by the user.
    expect(state.inventory_states).toHaveLength(before);
    expect(state.inventory_states.every((r) => r.owner_type === 'user')).toBe(true);
    expect(state.inventory_states.every((r) => r.owner_id === userId)).toBe(true);
    // Session is upgraded and now bound to the user.
    expect(state.sessions[0].user_id).toBe(userId);
    expect(state.sessions[0].upgraded_to_user_id).toBe(userId);
    // The presented token is returned as the (now user-authenticating) auth token.
    expect(payload.data.auth_token).toBe(token);
  });

  it('rejects a non-anonymous (already-registered) session token with 401', async () => {
    const token = mintToken();
    const tokenHash = await hashToken(token, ENV);
    const state = {
      users: [{ id: 'u-1', email_lower: 'x@y.com', password_hash: 'pbkdf2$1$a$b' }],
      sessions: [
        { id: 'sess-2', token_hash: tokenHash, user_id: 'u-1', revoked_at: null, last_seen_at: '' },
      ],
      inventory_states: [],
    };
    const env = { ...ENV, MP_DB: makeFakeD1(state) };
    const request = new Request('http://local/api/session/upgrade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ email: 'mover@example.com', password: 'password123' }),
    });
    // Handlers throw HttpError; the Pages _middleware converts it to a 401 envelope.
    await expect(upgrade({ request, env })).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
      status: 401,
    });
  });
});
