// test/quote.test.js — SPEC §6.5 fixtures EXACT.
import { describe, it, expect } from 'vitest';
import { quoteAnomaly } from '../functions/lib/quote.js';

describe('quoteAnomaly (§6.5)', () => {
  it('Example A (normal): 7000/1000 = 7.00 → not anomalous, deviation 0.00', () => {
    const r = quoteAnomaly(7000, 1000);
    expect(r.implied_density).toBe(7.0);
    expect(r.is_anomalous).toBe(false);
    expect(r.deviation_pct).toBe(0.0);
    expect(r.baseline).toBe(7.0);
    expect(r.lower_bound).toBe(5.95);
    expect(r.upper_bound).toBe(8.05);
  });

  it('Example B (low, anomalous): 5000/1000 = 5.00 → anomalous, deviation 28.57', () => {
    const r = quoteAnomaly(5000, 1000);
    expect(r.implied_density).toBe(5.0);
    expect(r.is_anomalous).toBe(true);
    expect(r.deviation_pct).toBe(28.57);
  });

  it('Example C (high, anomalous): 9000/1000 = 9.00 → anomalous, deviation 28.57', () => {
    const r = quoteAnomaly(9000, 1000);
    expect(r.implied_density).toBe(9.0);
    expect(r.is_anomalous).toBe(true);
    expect(r.deviation_pct).toBe(28.57);
  });

  it('Example D (boundary, normal): 12000/1500 = 8.00 → not anomalous, deviation 14.29', () => {
    const r = quoteAnomaly(12000, 1500);
    expect(r.implied_density).toBe(8.0);
    expect(r.is_anomalous).toBe(false);
    expect(r.deviation_pct).toBe(14.29);
  });

  it('rejects non-positive inputs', () => {
    expect(() => quoteAnomaly(0, 1000)).toThrow();
    expect(() => quoteAnomaly(7000, 0)).toThrow();
  });
});
