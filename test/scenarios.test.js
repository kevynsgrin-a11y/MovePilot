// test/scenarios.test.js — SPEC §6.6 fixtures EXACT.
import { describe, it, expect } from 'vitest';
import { scenarioModel } from '../functions/lib/scenarios.js';

describe('scenarioModel (§6.6)', () => {
  it('Example 1: distance=1000, labor_hours=8, weight=7000', () => {
    const r = scenarioModel({ distance_miles: 1000, labor_hours: 8, weight_lbs: 7000 });
    const byName = Object.fromEntries(r.scenarios.map((s) => [s.name, s]));
    // DIY = 40 + 1000×1.00 + fuel(1000)=350.00 + 8×60 = 1870.00
    expect(byName['DIY truck'].total_usd).toBe(1870.0);
    // Container = 200 + 1000×2.50 = 2700.00
    expect(byName['Container'].total_usd).toBe(2700.0);
    // Full-service = 7000 × 0.70 = 4900.00
    expect(byName['Full-service'].total_usd).toBe(4900.0);
    expect(r.ranked).toEqual(['DIY truck', 'Container', 'Full-service']);
  });

  it('Example 2: distance=250, labor_hours=4, weight=3000', () => {
    const r = scenarioModel({ distance_miles: 250, labor_hours: 4, weight_lbs: 3000 });
    const byName = Object.fromEntries(r.scenarios.map((s) => [s.name, s]));
    // DIY = 40 + 250 + fuel(250)=87.50 + 240 = 617.50
    expect(byName['DIY truck'].total_usd).toBe(617.5);
    // Container = 200 + 625 = 825.00
    expect(byName['Container'].total_usd).toBe(825.0);
    // Full-service = 3000×0.70 = 2100.00
    expect(byName['Full-service'].total_usd).toBe(2100.0);
    expect(r.ranked).toEqual(['DIY truck', 'Container', 'Full-service']);
  });

  it('line items sum to each scenario total', () => {
    const r = scenarioModel({ distance_miles: 1000, labor_hours: 8, weight_lbs: 7000 });
    for (const s of r.scenarios) {
      const sum = s.line_items.reduce((a, li) => a + li.amount_usd, 0);
      expect(Math.round(sum * 100) / 100).toBe(s.total_usd);
    }
  });

  it('rejects invalid inputs', () => {
    expect(() => scenarioModel({ distance_miles: 0, labor_hours: 1, weight_lbs: 1 })).toThrow();
    expect(() => scenarioModel({ distance_miles: 1, labor_hours: -1, weight_lbs: 1 })).toThrow();
    expect(() => scenarioModel({ distance_miles: 1, labor_hours: 1, weight_lbs: 0 })).toThrow();
  });
});
