// test/leads.test.js — SPEC §7.3 Phase-3 validated-lead guard.
// No live internet: exercises the KV-cache-hit path with a mocked MP_KV.
import { describe, it, expect } from 'vitest';
import { isLeadEligible } from '../functions/lib/leads.js';

/** Build a mock env whose MP_KV returns the given cached record for any usdot key. */
function mockEnv(records) {
  return {
    MP_KV: {
      async get(key) {
        return Object.prototype.hasOwnProperty.call(records, key)
          ? JSON.stringify(records[key])
          : null;
      },
    },
  };
}

describe('isLeadEligible (§7.3 guard)', () => {
  it('eligible: authorized_for_hhg && meets_750k_minimum both true', async () => {
    const env = mockEnv({
      'fmcsa:usdot:1234567': {
        source: 'FMCSA SAFER',
        fetched_at: '2026-07-01T00:00:00.000Z',
        parsed: { authorized_for_hhg: true, meets_750k_minimum: true },
      },
    });
    expect(await isLeadEligible('1234567', env)).toBe(true);
  });

  it('ineligible: authorized but under $750k minimum', async () => {
    const env = mockEnv({
      'fmcsa:usdot:2222222': {
        parsed: { authorized_for_hhg: true, meets_750k_minimum: false },
      },
    });
    expect(await isLeadEligible('2222222', env)).toBe(false);
  });

  it('ineligible: meets minimum but NOT authorized for HHG', async () => {
    const env = mockEnv({
      'fmcsa:usdot:3333333': {
        parsed: { authorized_for_hhg: false, meets_750k_minimum: true },
      },
    });
    expect(await isLeadEligible('3333333', env)).toBe(false);
  });

  it('ineligible: unknown carrier not in KV and no FMCSA key → false', async () => {
    const env = mockEnv({});
    expect(await isLeadEligible('9999999', env)).toBe(false);
  });

  it('ineligible: empty/missing usdot → false', async () => {
    const env = mockEnv({});
    expect(await isLeadEligible('', env)).toBe(false);
    expect(await isLeadEligible(null, env)).toBe(false);
  });
});
