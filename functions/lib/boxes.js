// functions/lib/boxes.js
// SPEC §6.3 Box calculator.
//   small  = 7  × bedrooms          (BOX_RATES_PER_BEDROOM.small)
//   medium = 11 × bedrooms          (BOX_RATES_PER_BEDROOM.medium)
//   large  = 7  × bedrooms          (BOX_RATES_PER_BEDROOM.large)
//   total_box_volume_cuft = small×1.5 + medium×3.0 + large×4.5   (BOX_SIZES)
// bedrooms is an integer 1..10. Rounding (§6): cuft → 2 dec at the boundary.

import { round } from './round.js';
import { BOX_RATES_PER_BEDROOM, BOX_SIZES } from './constants.js';
import { HttpError } from './respond.js';

/**
 * Deterministic small/medium/large box counts + total box volume for a bedroom count.
 * @param {number} bedrooms integer 1..10
 * @param {{small:number,medium:number,large:number}} [rates] per-bedroom box rates
 * @returns {{bedrooms:number,boxes:{small:number,medium:number,large:number},total_box_volume_cuft:number}}
 * @throws {HttpError} VALIDATION if bedrooms out of the 1..10 range
 */
export function boxEstimate(bedrooms, rates = BOX_RATES_PER_BEDROOM) {
  if (!Number.isInteger(bedrooms) || bedrooms < 1 || bedrooms > 10) {
    throw new HttpError('VALIDATION', 'bedrooms must be an integer between 1 and 10');
  }
  const boxes = {
    small: rates.small * bedrooms,
    medium: rates.medium * bedrooms,
    large: rates.large * bedrooms,
  };
  const rawVolume =
    boxes.small * BOX_SIZES.small +
    boxes.medium * BOX_SIZES.medium +
    boxes.large * BOX_SIZES.large;
  return {
    bedrooms,
    boxes,
    total_box_volume_cuft: round(rawVolume, 2), // §6.3 boundary: cuft → 2 dec
  };
}
