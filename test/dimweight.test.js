// test/dimweight.test.js — SPEC §6.2 fixtures EXACT.
import { describe, it, expect } from 'vitest';
import { dimensionalWeight, airChargeableKg } from '../functions/lib/dimweight.js';

describe('dimensionalWeight (§6.2)', () => {
  it('Example A: 18×18×16 = 5184 cu in → 31.23 / 37.29 / 26.72', () => {
    expect(dimensionalWeight(18, 18, 16, 166).cubic_inches).toBe(5184);
    expect(dimensionalWeight(18, 18, 16, 166).dimensional_weight_lbs).toBe(31.23);
    expect(dimensionalWeight(18, 18, 16, 139).dimensional_weight_lbs).toBe(37.29);
    expect(dimensionalWeight(18, 18, 16, 194).dimensional_weight_lbs).toBe(26.72);
  });

  it('Example B: 24×24×24 = 13824 cu in → 83.28 / 99.45 / 71.26', () => {
    expect(dimensionalWeight(24, 24, 24, 166).cubic_inches).toBe(13824);
    expect(dimensionalWeight(24, 24, 24, 166).dimensional_weight_lbs).toBe(83.28);
    expect(dimensionalWeight(24, 24, 24, 139).dimensional_weight_lbs).toBe(99.45);
    expect(dimensionalWeight(24, 24, 24, 194).dimensional_weight_lbs).toBe(71.26);
  });

  it('default divisor is 166', () => {
    const r = dimensionalWeight(18, 18, 16);
    expect(r.divisor).toBe(166);
    expect(r.dimensional_weight_lbs).toBe(31.23);
  });

  it('rejects non-positive dims and unsupported divisor', () => {
    expect(() => dimensionalWeight(0, 18, 16, 166)).toThrow();
    expect(() => dimensionalWeight(18, -1, 16, 166)).toThrow();
    expect(() => dimensionalWeight(18, 18, 16, 150)).toThrow();
  });
});

describe('airChargeableKg (§6.2)', () => {
  it('CBM 1.3167 → 219.89 kg; CBM 2.7184 → 453.97 kg', () => {
    expect(airChargeableKg(1.3167)).toBe(219.89);
    expect(airChargeableKg(2.7184)).toBe(453.97);
  });
});
