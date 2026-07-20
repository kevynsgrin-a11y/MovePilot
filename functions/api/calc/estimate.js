// functions/api/calc/estimate.js  →  POST /api/calc/estimate
// SPEC §12.2 feature 24, §12.4, §12.5. No auth (anonymous top-of-funnel).
// Request: { bedrooms?|total_cuft?, origin:{lat,lng}|{zip}, destination:{lat,lng}|{zip} }
// Response: §12.4 estimate body. All math in functions/lib/estimate.js (reuses §6.4
// distance/fuel + §12.6 geo). Errors: 400 VALIDATION, 422 UNRESOLVED_LOCATION.

import { ok, errorResponse, HttpError } from '../../lib/respond.js';
import { computeEstimate } from '../../lib/estimate.js';

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    let body;
    try {
      body = await request.json();
    } catch {
      throw new HttpError('VALIDATION', 'request body must be valid JSON');
    }
    const result = await computeEstimate(body, env);
    return ok(result);
  } catch (e) {
    return errorResponse(e);
  }
}
