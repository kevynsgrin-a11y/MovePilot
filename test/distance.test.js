// test/distance.test.js — SPEC §6.4 fixtures EXACT.
import { describe, it, expect } from 'vitest';
import { haversineMiles, drivingMiles, fuelCost } from '../functions/lib/distance.js';
import { round } from '../functions/lib/round.js';

describe('haversine + driving (§6.4)', () => {
  it('Example A: (0,0)→(1,0) 1° lat → GC 69.09, driving 82.91', () => {
    const gc = haversineMiles({ lat: 0, lng: 0 }, { lat: 1, lng: 0 });
    expect(round(gc, 2)).toBe(69.09);
    // driving is computed from the UNROUNDED great-circle value
    expect(round(drivingMiles(gc), 2)).toBe(82.91);
  });

  it('Example B: (0,0)→(0,2) 2° lon → GC 138.19, driving 165.83', () => {
    const gc = haversineMiles({ lat: 0, lng: 0 }, { lat: 0, lng: 2 });
    expect(round(gc, 2)).toBe(138.19);
    expect(round(drivingMiles(gc), 2)).toBe(165.83);
  });

  it('rejects out-of-range lat/lng', () => {
    expect(() => haversineMiles({ lat: 91, lng: 0 }, { lat: 0, lng: 0 })).toThrow();
    expect(() => haversineMiles({ lat: 0, lng: 0 }, { lat: 0, lng: 181 })).toThrow();
  });
});

describe('fuelCost (§6.4)', () => {
  it('Fuel Example A: driving 1000.00 → 350.00', () => {
    expect(fuelCost(1000)).toBe(350.0);
  });

  it('Fuel Example B: driving 82.91 → 29.02', () => {
    expect(fuelCost(82.91)).toBe(29.02);
  });
});
