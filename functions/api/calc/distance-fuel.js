// functions/api/calc/distance-fuel.js  →  POST /api/calc/distance-fuel
// SPEC §3 feature 4, §5 (Calculators), §6.4. No auth.
// Request: { origin:{lat,lng}, destination:{lat,lng} }.
// Response: { great_circle_miles, driving_miles, gallons, fuel_cost_usd, constants }.
// Ordering matters (§6.4): driving is computed from the UNROUNDED great-circle value,
// then rounded; gallons/fuel use the 2-dec-rounded driving_miles.

import { ok, errorResponse, HttpError } from '../../lib/respond.js';
import {
  haversineMiles,
  drivingMiles,
  gallonsForMiles,
  fuelCost,
} from '../../lib/distance.js';
import { round } from '../../lib/round.js';
import { TRUCK_MPG, FUEL_PRICE_USD_PER_GAL, CIRCUITY_FACTOR } from '../../lib/constants.js';

export async function onRequestPost(context) {
  try {
    const { request } = context;
    let body;
    try {
      body = await request.json();
    } catch {
      throw new HttpError('VALIDATION', 'request body must be valid JSON');
    }
    const { origin, destination } = body || {};
    const gcRaw = haversineMiles(origin, destination); // unrounded
    const great_circle_miles = round(gcRaw, 2); // §6 boundary: miles → 2 dec
    const driving_miles = round(drivingMiles(gcRaw), 2); // from UNROUNDED gc, then round
    const gallons = round(gallonsForMiles(driving_miles), 3); // display 3 dec
    const fuel_cost_usd = fuelCost(driving_miles); // rounded 2 dec inside
    return ok({
      great_circle_miles,
      driving_miles,
      gallons,
      fuel_cost_usd,
      constants: {
        mpg: TRUCK_MPG,
        fuel_price_usd_per_gal: FUEL_PRICE_USD_PER_GAL,
        circuity: CIRCUITY_FACTOR,
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
