// functions/lib/distance.js
// SPEC §6.4 Distance + theoretical fuel cost.
// Constants: R=3958.8 mi (EARTH_RADIUS_MILES), circuity=1.2 (CIRCUITY_FACTOR),
//            MPG=10 (TRUCK_MPG), fuel=$3.50/gal (FUEL_PRICE_USD_PER_GAL).
//   Haversine great-circle:
//     a = sin²(Δφ/2) + cos(φ1)·cos(φ2)·sin²(Δλ/2)
//     c = 2·atan2(√a, √(1−a))
//     great_circle_miles = R·c
//   driving_miles = great_circle_miles × 1.2   (computed from UNROUNDED great-circle)
//   gallons       = driving_miles / MPG        (driving_miles already 2-dec rounded)
//   fuel_cost_usd = gallons × 3.50
// Rounding (§6): miles → 2 dec; USD → 2 dec; gallons kept full precision (display 3 dec).

import { round } from './round.js';
import {
  EARTH_RADIUS_MILES,
  CIRCUITY_FACTOR,
  TRUCK_MPG,
  FUEL_PRICE_USD_PER_GAL,
} from './constants.js';
import { HttpError } from './respond.js';

function toRadians(deg) {
  return (deg * Math.PI) / 180;
}

function validateCoord(point, name) {
  if (!point || typeof point !== 'object') {
    throw new HttpError('VALIDATION', `${name} must be a {lat,lng} object`);
  }
  const { lat, lng } = point;
  if (typeof lat !== 'number' || !Number.isFinite(lat) || lat < -90 || lat > 90) {
    throw new HttpError('VALIDATION', `${name}.lat must be between -90 and 90`);
  }
  if (typeof lng !== 'number' || !Number.isFinite(lng) || lng < -180 || lng > 180) {
    throw new HttpError('VALIDATION', `${name}.lng must be between -180 and 180`);
  }
}

/**
 * Great-circle distance in miles (UNROUNDED — round at the response boundary only).
 * @param {{lat:number,lng:number}} a origin
 * @param {{lat:number,lng:number}} b destination
 * @returns {number} great-circle miles, full precision
 * @throws {HttpError} VALIDATION if lat/lng out of range
 */
export function haversineMiles(a, b) {
  validateCoord(a, 'origin');
  validateCoord(b, 'destination');
  const phi1 = toRadians(a.lat);
  const phi2 = toRadians(b.lat);
  const dPhi = toRadians(b.lat - a.lat);
  const dLambda = toRadians(b.lng - a.lng);
  const h =
    Math.sin(dPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return EARTH_RADIUS_MILES * c;
}

/**
 * Driving miles from great-circle miles via the fixed road circuity factor (1.2).
 * Pass the UNROUNDED great-circle value (§6.4).
 * @param {number} greatCircleMiles
 * @returns {number} driving miles, full precision
 */
export function drivingMiles(greatCircleMiles) {
  return greatCircleMiles * CIRCUITY_FACTOR;
}

/**
 * Gallons of fuel for a driving distance. §6.4: gallons = driving_miles / MPG (10).
 * @param {number} drivingMilesValue driving miles (already 2-dec rounded per §6.4)
 * @returns {number} gallons, full precision
 */
export function gallonsForMiles(drivingMilesValue) {
  return drivingMilesValue / TRUCK_MPG;
}

/**
 * Theoretical fuel cost (USD) for a driving distance.
 * §6.4: fuel_cost_usd = (driving_miles / MPG) × 3.50. Rounded 2 dec.
 * @param {number} drivingMilesValue driving miles (already 2-dec rounded per §6.4)
 * @returns {number} fuel cost USD, rounded 2 dec
 */
export function fuelCost(drivingMilesValue) {
  const gallons = gallonsForMiles(drivingMilesValue);
  return round(gallons * FUEL_PRICE_USD_PER_GAL, 2); // §6.4 boundary: USD → 2 dec
}
