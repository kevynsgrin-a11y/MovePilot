// test/volume.test.js — SPEC §6.1 fixtures EXACT.
import { describe, it, expect } from 'vitest';
import { computeVolume } from '../functions/lib/volume.js';

// Item catalog mirrors seed/item_volumes.json (box keys + the named items used below).
const itemTable = {
  small: { label: 'Small box', volume_cuft: 1.5 },
  medium: { label: 'Medium box', volume_cuft: 3.0 },
  large: { label: 'Large box', volume_cuft: 4.5 },
  sofa: { label: 'Sofa (3-seat)', volume_cuft: 45.0 },
  queen_bed: { label: 'Queen bed + mattress', volume_cuft: 60.0 },
  dining_chair: { label: 'Dining chair', volume_cuft: 5.0 },
};

describe('computeVolume (§6.1)', () => {
  it('Example A: 10 medium + 5 small + 2 large → 46.50 / 1.3167', () => {
    const r = computeVolume(
      [
        { key: 'medium', quantity: 10 },
        { key: 'small', quantity: 5 },
        { key: 'large', quantity: 2 },
      ],
      itemTable,
    );
    expect(r.total_cuft).toBe(46.5);
    expect(r.total_cbm).toBe(1.3167);
  });

  it('Example B: 32 medium → 96.00 / 2.7184', () => {
    const r = computeVolume([{ key: 'medium', quantity: 32 }], itemTable);
    expect(r.total_cuft).toBe(96.0);
    expect(r.total_cbm).toBe(2.7184);
  });

  it('Example C (named items): sofa + queen_bed + 4 dining_chair → 125.00 / 3.5396', () => {
    const r = computeVolume(
      [
        { key: 'sofa', quantity: 1 },
        { key: 'queen_bed', quantity: 1 },
        { key: 'dining_chair', quantity: 4 },
      ],
      itemTable,
    );
    expect(r.total_cuft).toBe(125.0);
    expect(r.total_cbm).toBe(3.5396);
    // subtotal check: 4 dining chairs × 5.0 = 20.0
    const chairs = r.line_items.find((l) => l.key === 'dining_chair');
    expect(chairs.subtotal_cuft).toBe(20.0);
    expect(chairs.label).toBe('Dining chair');
  });

  it('rejects empty list, unknown key, and non-positive quantity', () => {
    expect(() => computeVolume([], itemTable)).toThrow();
    expect(() => computeVolume([{ key: 'nope', quantity: 1 }], itemTable)).toThrow();
    expect(() => computeVolume([{ key: 'medium', quantity: 0 }], itemTable)).toThrow();
    expect(() => computeVolume([{ key: 'medium', quantity: 1.5 }], itemTable)).toThrow();
  });
});
