// functions/lib/dimweight.js
// SPEC §6.2 Dimensional weight.
//   cubic_inches           = length_in × width_in × height_in
//   dimensional_weight_lbs = cubic_inches / divisor    // divisor ∈ {139, 166 (default), 194}
// International air chargeable weight: chargeable_kg = CBM × 167 (AIR_KG_PER_CBM).
// Rounding (§6): dimensional weight lbs → 2 dec, kg → 2 dec, at the boundary.

import { round } from './round.js';
import { ALLOWED_DIVISORS, DEFAULT_DIVISOR, AIR_KG_PER_CBM } from './constants.js';
import { HttpError } from './respond.js';

/**
 * Dimensional weight from box dimensions (inches) and a shipping divisor.
 * @param {number} length_in >0
 * @param {number} width_in  >0
 * @param {number} height_in >0
 * @param {number} [divisor=166] one of 139 | 166 | 194
 * @returns {{cubic_inches:number,divisor:number,dimensional_weight_lbs:number}}
 * @throws {HttpError} VALIDATION on non-positive dims or unsupported divisor
 */
export function dimensionalWeight(length_in, width_in, height_in, divisor = DEFAULT_DIVISOR) {
  for (const [name, v] of [['length_in', length_in], ['width_in', width_in], ['height_in', height_in]]) {
    if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) {
      throw new HttpError('VALIDATION', `${name} must be a positive number`);
    }
  }
  const div = divisor == null ? DEFAULT_DIVISOR : divisor;
  if (!ALLOWED_DIVISORS.includes(div)) {
    throw new HttpError('VALIDATION', `divisor must be one of ${ALLOWED_DIVISORS.join(', ')}`);
  }
  const cubic_inches = length_in * width_in * height_in;
  const dimensional_weight_lbs = round(cubic_inches / div, 2); // §6.2 boundary: lbs → 2 dec
  return { cubic_inches, divisor: div, dimensional_weight_lbs };
}

/**
 * International air chargeable weight in kg from cubic meters.
 * §6.2: chargeable_kg = CBM × 167. kg → 2 dec.
 * @param {number} cbm cubic meters
 * @returns {number} chargeable kg (rounded 2 dec)
 */
export function airChargeableKg(cbm) {
  if (typeof cbm !== 'number' || !Number.isFinite(cbm) || cbm < 0) {
    throw new HttpError('VALIDATION', 'cbm must be a non-negative number');
  }
  return round(cbm * AIR_KG_PER_CBM, 2);
}
