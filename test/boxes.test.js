// test/boxes.test.js — SPEC §6.3 fixtures EXACT.
import { describe, it, expect } from 'vitest';
import { boxEstimate } from '../functions/lib/boxes.js';

describe('boxEstimate (§6.3)', () => {
  it('Example A: 3 bedrooms → {21,33,21} / 225.00', () => {
    const r = boxEstimate(3);
    expect(r.boxes).toEqual({ small: 21, medium: 33, large: 21 });
    expect(r.total_box_volume_cuft).toBe(225.0);
  });

  it('Example B: 1 bedroom → {7,11,7} / 75.00', () => {
    const r = boxEstimate(1);
    expect(r.boxes).toEqual({ small: 7, medium: 11, large: 7 });
    expect(r.total_box_volume_cuft).toBe(75.0);
  });

  it('rejects bedrooms out of 1..10 range', () => {
    expect(() => boxEstimate(0)).toThrow();
    expect(() => boxEstimate(11)).toThrow();
    expect(() => boxEstimate(2.5)).toThrow();
  });
});
