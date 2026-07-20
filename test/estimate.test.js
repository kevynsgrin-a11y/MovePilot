// test/estimate.test.js — SPEC §12.5 anonymous-estimate fixtures A & B, EXACT.
// Explicit lat/lng so the fixtures are self-contained (no KV needed); driving/fuel
// reuse §6.4. Every returned field is asserted.
import { describe, it, expect } from 'vitest';
import { computeEstimate } from '../functions/lib/estimate.js';

describe('computeEstimate (§12.5)', () => {
  it('Example A: total_cuft=840, (0,0)→(1,0) → diy band', async () => {
    const out = await computeEstimate(
      { total_cuft: 840, origin: { lat: 0, lng: 0 }, destination: { lat: 1, lng: 0 } },
      {}
    );
    expect(out).toEqual({
      total_cuft: 840,
      est_weight_lbs: 5880, // round(840 × 7)
      distance_miles: 82.91, // round(haversine × 1.2, 2)
      fuel_cost_usd: 29.02, // round((82.91/10) × 3.50, 2)
      full_service_mid_usd: 3316.88, // round(5880 × (0.55 + 0.00017×82.91), 2)
      cost_low_usd: 2819, // round(3316.88 × 0.85)
      cost_high_usd: 3814, // round(3316.88 × 1.15)
      recommendation: 'diy', // 82.91 < 150
      recommendation_text:
        'At 82.91 driving miles, a DIY truck rental or portable container is typically more economical than full-service.',
      origin: { lat: 0, lng: 0 },
      destination: { lat: 1, lng: 0 },
    });
  });

  it('Example B: total_cuft=1300, (0,0)→(2,0) → full_service band', async () => {
    const out = await computeEstimate(
      { total_cuft: 1300, origin: { lat: 0, lng: 0 }, destination: { lat: 2, lng: 0 } },
      {}
    );
    expect(out).toEqual({
      total_cuft: 1300,
      est_weight_lbs: 9100, // round(1300 × 7)
      distance_miles: 165.83, // round(haversine × 1.2, 2)
      fuel_cost_usd: 58.04, // round((165.83/10) × 3.50, 2)
      full_service_mid_usd: 5261.54, // round(9100 × (0.55 + 0.00017×165.83), 2)
      cost_low_usd: 4472, // round(5261.54 × 0.85)
      cost_high_usd: 6051, // round(5261.54 × 1.15)
      recommendation: 'full_service', // 165.83 ≥ 150
      recommendation_text:
        'At 165.83 driving miles, a full-service interstate carrier is typically the best value; use the FMCSA lookup to verify any mover before booking.',
      origin: { lat: 0, lng: 0 },
      destination: { lat: 2, lng: 0 },
    });
  });

  it('bedrooms preset resolves total_cuft (two → 840, matches Example A math)', async () => {
    const out = await computeEstimate(
      { bedrooms: 'two', origin: { lat: 0, lng: 0 }, destination: { lat: 1, lng: 0 } },
      {}
    );
    expect(out.total_cuft).toBe(840);
    expect(out.est_weight_lbs).toBe(5880);
    expect(out.full_service_mid_usd).toBe(3316.88);
  });

  it('rejects neither/both size inputs (400 VALIDATION)', async () => {
    const base = { origin: { lat: 0, lng: 0 }, destination: { lat: 1, lng: 0 } };
    await expect(computeEstimate({ ...base }, {})).rejects.toMatchObject({ code: 'VALIDATION' });
    await expect(
      computeEstimate({ ...base, bedrooms: 'two', total_cuft: 840 }, {})
    ).rejects.toMatchObject({ code: 'VALIDATION' });
  });

  it('resolves a ZIP endpoint and echoes city/state', async () => {
    const out = await computeEstimate(
      { total_cuft: 840, origin: { zip: '10001' }, destination: { lat: 1, lng: 0 } },
      {}
    );
    expect(out.origin).toMatchObject({ lat: 40.7506, lng: -73.9971, city: 'New York', state: 'NY' });
  });

  it('unresolved ZIP → 422 UNRESOLVED_LOCATION', async () => {
    await expect(
      computeEstimate(
        { total_cuft: 840, origin: { zip: '99999' }, destination: { lat: 1, lng: 0 } },
        {}
      )
    ).rejects.toMatchObject({ code: 'UNRESOLVED_LOCATION', status: 422 });
  });
});
