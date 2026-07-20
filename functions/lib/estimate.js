// functions/lib/estimate.js
// SPEC §12.5 (§6.10) Anonymous move estimate. Cloudflare Workers runtime only.
// A deliberately simple, transparent top-of-funnel estimate for an UNauthenticated
// visitor — no fake precision beyond the documented §12.1 constants. Detailed
// multi-scenario modeling / PDF normalization / anomaly detection stay premium (§6.6).
//
// Formula (§12.5), all rounding round-half-up via round():
//   total_cuft     = total_cuft (if given) else BEDROOM_CUFT[bedrooms]
//   est_weight_lbs = round(total_cuft × 7.0)                       // integer
//   distance_miles = round( haversine(o,d) × 1.2 , 2 )            // reuse §6.4 driving
//   fuel_cost_usd  = round( (distance_miles / 10) × 3.50 , 2 )    // reuse §6.4 fuel
//   full_service_per_lb  = 0.55 + 0.00017 × distance_miles
//   full_service_mid_usd = round( est_weight_lbs × per_lb , 2 )
//   cost_low_usd   = round( mid × 0.85 )                          // integer dollars
//   cost_high_usd  = round( mid × 1.15 )
//   recommendation = distance_miles ≥ 150 ? 'full_service' : 'diy'

import { round } from './round.js';
import { haversineMiles, drivingMiles, fuelCost } from './distance.js';
import { resolveZip } from './geo.js';
import { HttpError } from './respond.js';
import {
  BEDROOM_CUFT,
  HHG_DENSITY_LB_PER_CUFT,
  FS_BASE_USD_PER_LB,
  FS_DIST_COEFF,
  ESTIMATE_RANGE_PCT,
  FULLSERVICE_MIN_MILES,
} from './constants.js';

/**
 * Resolve one lane endpoint to {lat,lng,city?,state?}.
 *  - explicit {lat,lng} → used as-is (city/state omitted)
 *  - {zip} → seeded ZIP-3 centroid (§12.6); unresolved/malformed → 422 UNRESOLVED_LOCATION
 * @param {object} point @param {object} env @param {string} name
 * @returns {Promise<{lat:number,lng:number,city?:string,state?:string}>}
 */
async function resolveEndpoint(point, env, name) {
  if (!point || typeof point !== 'object') {
    throw new HttpError('VALIDATION', `${name} must be a {lat,lng} or {zip} object.`);
  }
  // Explicit coordinates take precedence.
  if (point.lat != null || point.lng != null) {
    return { lat: point.lat, lng: point.lng }; // haversineMiles validates the range
  }
  if (point.zip != null) {
    const r = await resolveZip(point.zip, env);
    if (!r.found) {
      throw new HttpError(
        'UNRESOLVED_LOCATION',
        `Could not resolve ${name} ZIP "${r.zip}". Pass explicit lat/lng or use a supported metro ZIP.`,
        422
      );
    }
    return { lat: r.lat, lng: r.lng, city: r.city, state: r.state };
  }
  throw new HttpError('VALIDATION', `${name} must provide either {lat,lng} or {zip}.`);
}

/** Echo an endpoint back, including city/state only when they were resolved. */
function echoEndpoint(ep) {
  const out = { lat: ep.lat, lng: ep.lng };
  if (ep.city != null) out.city = ep.city;
  if (ep.state != null) out.state = ep.state;
  return out;
}

/**
 * Compute the anonymous move estimate (§12.5).
 * @param {object} input { bedrooms?, total_cuft?, origin, destination }
 * @param {object} env
 * @returns {Promise<object>} the §12.4 estimate response body
 * @throws {HttpError} VALIDATION (400) / UNRESOLVED_LOCATION (422)
 */
export async function computeEstimate(input, env) {
  const body = input || {};

  // --- size input: EXACTLY one of bedrooms / total_cuft (§12.4) ---
  const hasBedrooms = body.bedrooms != null;
  const hasCuft = body.total_cuft != null;
  if (hasBedrooms === hasCuft) {
    throw new HttpError('VALIDATION', 'Provide exactly one of `bedrooms` or `total_cuft`.');
  }

  let total_cuft;
  if (hasCuft) {
    total_cuft = Number(body.total_cuft);
    if (!Number.isFinite(total_cuft) || total_cuft <= 0) {
      throw new HttpError('VALIDATION', '`total_cuft` must be a positive number.');
    }
  } else {
    if (!Object.prototype.hasOwnProperty.call(BEDROOM_CUFT, body.bedrooms)) {
      throw new HttpError(
        'VALIDATION',
        '`bedrooms` must be one of: studio, one, two, three, four.'
      );
    }
    total_cuft = BEDROOM_CUFT[body.bedrooms];
  }

  // --- resolve lane endpoints ---
  const origin = await resolveEndpoint(body.origin, env, 'origin');
  const destination = await resolveEndpoint(body.destination, env, 'destination');

  // --- distance + fuel (reuse §6.4) ---
  const gcRaw = haversineMiles(origin, destination); // unrounded great-circle
  const distance_miles = round(drivingMiles(gcRaw), 2); // × 1.2, round 2 dec
  const fuel_cost_usd = fuelCost(distance_miles); // (miles/10)×3.50, round 2 dec

  // --- weight + full-service cost band (§12.5) ---
  const est_weight_lbs = round(total_cuft * HHG_DENSITY_LB_PER_CUFT); // integer
  const full_service_per_lb = FS_BASE_USD_PER_LB + FS_DIST_COEFF * distance_miles;
  const full_service_mid_usd = round(est_weight_lbs * full_service_per_lb, 2);
  const cost_low_usd = round(full_service_mid_usd * (1 - ESTIMATE_RANGE_PCT)); // integer $
  const cost_high_usd = round(full_service_mid_usd * (1 + ESTIMATE_RANGE_PCT)); // integer $

  // --- recommendation (§12.5) ---
  const recommendation = distance_miles >= FULLSERVICE_MIN_MILES ? 'full_service' : 'diy';
  const recommendation_text =
    recommendation === 'full_service'
      ? `At ${distance_miles} driving miles, a full-service interstate carrier is typically the best value; use the FMCSA lookup to verify any mover before booking.`
      : `At ${distance_miles} driving miles, a DIY truck rental or portable container is typically more economical than full-service.`;

  return {
    total_cuft,
    est_weight_lbs,
    distance_miles,
    fuel_cost_usd,
    cost_low_usd,
    cost_high_usd,
    full_service_mid_usd,
    recommendation,
    recommendation_text,
    origin: echoEndpoint(origin),
    destination: echoEndpoint(destination),
  };
}
