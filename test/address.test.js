// test/address.test.js — SPEC §6.9 fixture EXACT.
import { describe, it, expect } from 'vitest';
import {
  standardizeAddressFallback,
  UTILITY_CHECKLIST,
  US_STATES,
} from '../functions/lib/address.js';

describe('standardizeAddressFallback (§6.9)', () => {
  it('normalizes the §6.9 fixture exactly', () => {
    const r = standardizeAddressFallback({
      street: '123 main st',
      city: 'austin',
      state: 'tx',
      zip: '78701-1234',
    });
    expect(r).toEqual({
      street: '123 Main Street',
      city: 'Austin',
      state: 'TX',
      zip: '78701',
      zip4: '1234',
    });
  });

  it('omits zip4 when the input has no -#### suffix', () => {
    const r = standardizeAddressFallback({
      street: '55 oak ave',
      city: 'san jose',
      state: 'ca',
      zip: '95112',
    });
    expect(r.street).toBe('55 Oak Avenue');
    expect(r.city).toBe('San Jose');
    expect(r.state).toBe('CA');
    expect(r.zip).toBe('95112');
    expect(r.zip4).toBeUndefined();
  });

  it('expands each supported street suffix on the last token', () => {
    const cases = [
      ['10 elm rd', '10 Elm Road'],
      ['7 king blvd', '7 King Boulevard'],
      ['2 pine dr', '2 Pine Drive'],
      ['9 fox ln', '9 Fox Lane'],
      ['4 court ct', '4 Court Court'],
    ];
    for (const [input, expected] of cases) {
      const r = standardizeAddressFallback({ street: input, city: 'reno', state: 'nv', zip: '89501' });
      expect(r.street).toBe(expected);
    }
  });

  it('collapses internal whitespace in the street', () => {
    const r = standardizeAddressFallback({
      street: '123   main    st',
      city: 'austin',
      state: 'tx',
      zip: '78701',
    });
    expect(r.street).toBe('123 Main Street');
  });

  it('rejects an invalid state code with a VALIDATION error', () => {
    expect(() =>
      standardizeAddressFallback({ street: '1 a st', city: 'x', state: 'ZZ', zip: '10001' })
    ).toThrow();
  });

  it('rejects missing fields', () => {
    expect(() =>
      standardizeAddressFallback({ street: '', city: 'x', state: 'TX', zip: '10001' })
    ).toThrow();
  });

  it('exposes the static utility checklist and US_STATES set', () => {
    expect(Array.isArray(UTILITY_CHECKLIST)).toBe(true);
    expect(UTILITY_CHECKLIST.length).toBeGreaterThan(0);
    for (const entry of UTILITY_CHECKLIST) {
      expect(typeof entry.category).toBe('string');
      expect(typeof entry.task).toBe('string');
    }
    expect(US_STATES.has('TX')).toBe(true);
    expect(US_STATES.has('DC')).toBe(true);
    expect(US_STATES.size).toBe(51); // 50 states + DC
  });
});
