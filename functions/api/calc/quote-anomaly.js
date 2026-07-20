// functions/api/calc/quote-anomaly.js  →  POST /api/calc/quote-anomaly
// SPEC §3 feature 5, §5 (Calculators), §6.5. No auth.
// Request: { quoted_weight_lbs>0, quoted_volume_cuft>0 }.

import { ok, errorResponse, HttpError } from '../../lib/respond.js';
import { quoteAnomaly } from '../../lib/quote.js';

export async function onRequestPost(context) {
  try {
    const { request } = context;
    let body;
    try {
      body = await request.json();
    } catch {
      throw new HttpError('VALIDATION', 'request body must be valid JSON');
    }
    const { quoted_weight_lbs, quoted_volume_cuft } = body || {};
    const result = quoteAnomaly(quoted_weight_lbs, quoted_volume_cuft);
    return ok(result);
  } catch (e) {
    return errorResponse(e);
  }
}
