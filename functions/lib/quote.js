// functions/lib/quote.js
// SPEC §6.5 Quote normalization / anomaly detection.
// Constants: baseline 7.0 lb/cu ft (DENSITY_BASELINE); ±15% tolerance →
//            lower 5.95 (DENSITY_LOWER_BOUND), upper 8.05 (DENSITY_UPPER_BOUND).
//   implied_density = quoted_weight_lbs / quoted_volume_cuft     // round 2 dec
//   deviation_pct   = |implied_density − 7.0| / 7.0 × 100        // round 2 dec
//   is_anomalous    = (implied_density < 5.95) OR (implied_density > 8.05)
// Rounding (§6): density → 2 dec, at the boundary.

import { round } from './round.js';
import {
  DENSITY_BASELINE,
  DENSITY_LOWER_BOUND,
  DENSITY_UPPER_BOUND,
} from './constants.js';
import { HttpError } from './respond.js';

const ANOMALOUS_REASON = (d) =>
  `Implied density ${d} lb/cu ft is outside the 5.95–8.05 range (>15% from the 7.0 baseline); ` +
  'possible non-binding-estimate inflation / hostage-load risk.';
const NORMAL_REASON = 'Within normal household-goods density range.';

/**
 * Implied density + anomaly flag for a quoted weight/volume pair.
 * @param {number} quoted_weight_lbs  >0
 * @param {number} quoted_volume_cuft >0
 * @returns {{implied_density:number,baseline:number,lower_bound:number,upper_bound:number,deviation_pct:number,is_anomalous:boolean,reason:string}}
 * @throws {HttpError} VALIDATION on non-positive inputs
 */
export function quoteAnomaly(quoted_weight_lbs, quoted_volume_cuft) {
  if (typeof quoted_weight_lbs !== 'number' || !Number.isFinite(quoted_weight_lbs) || quoted_weight_lbs <= 0) {
    throw new HttpError('VALIDATION', 'quoted_weight_lbs must be a positive number');
  }
  if (typeof quoted_volume_cuft !== 'number' || !Number.isFinite(quoted_volume_cuft) || quoted_volume_cuft <= 0) {
    throw new HttpError('VALIDATION', 'quoted_volume_cuft must be a positive number');
  }

  const implied_density = round(quoted_weight_lbs / quoted_volume_cuft, 2); // §6.5 boundary: 2 dec
  const deviation_pct = round((Math.abs(implied_density - DENSITY_BASELINE) / DENSITY_BASELINE) * 100, 2);
  const is_anomalous =
    implied_density < DENSITY_LOWER_BOUND || implied_density > DENSITY_UPPER_BOUND;
  const reason = is_anomalous ? ANOMALOUS_REASON(implied_density) : NORMAL_REASON;

  return {
    implied_density,
    baseline: DENSITY_BASELINE,
    lower_bound: DENSITY_LOWER_BOUND,
    upper_bound: DENSITY_UPPER_BOUND,
    deviation_pct,
    is_anomalous,
    reason,
  };
}
