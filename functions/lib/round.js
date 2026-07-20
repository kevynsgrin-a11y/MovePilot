// functions/lib/round.js
// SPEC §6 rounding rule: ONE shared round-half-up helper used at every response
// boundary. round-half-up formula (verbatim from spec):
//   Math.round(value * 10**d + Number.EPSILON) / 10**d
// The + Number.EPSILON nudge defeats binary-float representation error so that
// exact half values (…5 at the target decimal) always round UP.

/**
 * Round `value` to `decimals` places using round-half-up.
 * @param {number} value
 * @param {number} [decimals=0]
 * @returns {number}
 */
export function round(value, decimals = 0) {
  const f = 10 ** decimals;
  return Math.round(value * f + Number.EPSILON) / f;
}
