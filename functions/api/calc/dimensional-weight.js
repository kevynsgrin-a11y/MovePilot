// functions/api/calc/dimensional-weight.js  →  POST /api/calc/dimensional-weight
// SPEC §3 feature 2, §5 (Calculators), §6.2. No auth.
// Request: { length_in>0, width_in>0, height_in>0, divisor?:139|166|194 (default 166) }.

import { ok, errorResponse, HttpError } from '../../lib/respond.js';
import { dimensionalWeight } from '../../lib/dimweight.js';
import { DEFAULT_DIVISOR } from '../../lib/constants.js';

export async function onRequestPost(context) {
  try {
    const { request } = context;
    let body;
    try {
      body = await request.json();
    } catch {
      throw new HttpError('VALIDATION', 'request body must be valid JSON');
    }
    const { length_in, width_in, height_in } = body || {};
    // Default divisor to 166 (domestic) when omitted; dimensionalWeight validates the value.
    const divisor = body && body.divisor != null ? body.divisor : DEFAULT_DIVISOR;
    const result = dimensionalWeight(length_in, width_in, height_in, divisor);
    return ok(result);
  } catch (e) {
    return errorResponse(e);
  }
}
