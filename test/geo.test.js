// test/geo.test.js — SPEC §12.6 geocode resolve + §12.7 catalog + §12.4 alerts list.
// No live internet; no KV binding → geo.js falls back to its bundled starter table.
import { describe, it, expect } from 'vitest';
import { resolveZip } from '../functions/lib/geo.js';
import { onRequestGet as catalogGet } from '../functions/api/catalog/items.js';
import { onRequestGet as alertsGet } from '../functions/api/vault/alerts.js';

describe('resolveZip (§12.6)', () => {
  it('100 → New York NY', async () => {
    const r = await resolveZip('10001', {});
    expect(r).toEqual({
      found: true,
      zip: '10001',
      zip3: '100',
      lat: 40.7506,
      lng: -73.9971,
      city: 'New York',
      state: 'NY',
    });
  });

  it('303 → Atlanta GA', async () => {
    const r = await resolveZip('30301', {});
    expect(r).toMatchObject({ found: true, zip3: '303', city: 'Atlanta', state: 'GA' });
  });

  it('unseeded prefix → found:false (200 semantics)', async () => {
    expect(await resolveZip('99999', {})).toEqual({ found: false, zip: '99999' });
  });

  it('malformed zip (not 5 digits) → found:false, malformed:true', async () => {
    expect(await resolveZip('123', {})).toEqual({ found: false, malformed: true, zip: '123' });
    expect(await resolveZip('abcde', {})).toMatchObject({ malformed: true });
  });

  it('KV geo:zip3:<prefix> overrides the bundled table when present', async () => {
    const env = {
      MP_KV: {
        async get(k) {
          return k === 'geo:zip3:100'
            ? JSON.stringify({ lat: 1, lng: 2, city: 'KVOverride', state: 'ZZ' })
            : null;
        },
      },
    };
    expect(await resolveZip('10001', env)).toMatchObject({ city: 'KVOverride', state: 'ZZ' });
  });
});

describe('GET /api/catalog/items (§12.7)', () => {
  it('returns the item catalog array and bedroom presets', async () => {
    const res = await catalogGet({ env: {} });
    const body = await res.json();
    expect(body.ok).toBe(true);

    const { items, bedroom_presets } = body.data;
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeGreaterThanOrEqual(20);
    // Every item has the documented shape.
    for (const it of items) {
      expect(it).toEqual({
        key: expect.any(String),
        label: expect.any(String),
        volume_cuft: expect.any(Number),
      });
    }
    const sofa = items.find((i) => i.key === 'sofa');
    expect(sofa).toMatchObject({ label: 'Sofa (3-seat)', volume_cuft: 45.0 });

    // Presets: one per §12.1 size, cuft matches BEDROOM_CUFT, items are valid catalog keys.
    const keys = new Set(items.map((i) => i.key));
    const expectedCuft = { studio: 300, one: 450, two: 840, three: 1300, four: 1800 };
    expect(Object.keys(bedroom_presets).sort()).toEqual(
      ['four', 'one', 'studio', 'three', 'two']
    );
    for (const [size, cuft] of Object.entries(expectedCuft)) {
      const p = bedroom_presets[size];
      expect(p.cuft).toBe(cuft);
      expect(Array.isArray(p.items)).toBe(true);
      expect(p.items.length).toBeGreaterThan(0);
      for (const k of p.items) expect(keys.has(k)).toBe(true);
    }
  });
});

// --- Minimal D1 mock supporting the getSession → requirePremium → alerts SELECT chain ---
function mockAuthEnv({ isPremium, alerts = [] }) {
  const session = { id: 'sess1', token_hash: 'x', user_id: 'user1', revoked_at: null };
  const user = { id: 'user1', is_premium: isPremium ? 1 : 0, is_admin: 0 };
  const db = {
    prepare(sql) {
      let params = [];
      return {
        bind(...p) {
          params = p;
          return this;
        },
        async first() {
          if (/FROM sessions/i.test(sql)) return session;
          if (/FROM users/i.test(sql)) return user;
          return null;
        },
        async run() {
          return { meta: {} };
        },
        async all() {
          if (/FROM alerts/i.test(sql)) {
            // echo only the SELECTed columns for the requested user_id
            return { results: params[0] === 'user1' ? alerts : [] };
          }
          return { results: [] };
        },
      };
    },
  };
  return { MP_DB: db };
}

function bearerRequest() {
  return new Request('https://x/api/vault/alerts', {
    headers: { Authorization: 'Bearer test-token' },
  });
}

describe('GET /api/vault/alerts (§12.4, premium-gated)', () => {
  it('premium user → 200 with their alerts', async () => {
    const alerts = [
      {
        id: 'al1',
        timeline_id: null,
        task_title: 'Confirm carrier',
        send_at: '2026-08-01T15:00:00.000Z',
        status: 'scheduled',
        created_at: '2026-07-19T00:00:00.000Z',
      },
    ];
    const env = mockAuthEnv({ isPremium: true, alerts });
    const res = await alertsGet({ request: bearerRequest(), env });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.alerts).toEqual(alerts);
  });

  it('non-premium user → 402 PREMIUM_REQUIRED', async () => {
    const env = mockAuthEnv({ isPremium: false });
    await expect(alertsGet({ request: bearerRequest(), env })).rejects.toMatchObject({
      code: 'PREMIUM_REQUIRED',
      status: 402,
    });
  });
});
