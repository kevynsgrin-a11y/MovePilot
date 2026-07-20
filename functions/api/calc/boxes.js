// functions/api/calc/boxes.js  →  POST /api/calc/boxes
// SPEC §3 feature 3, §5 (Calculators), §6.3. No auth.
// Request: { bedrooms:int 1..10 }.

import { ok, errorResponse, HttpError } from '../../lib/respond.js';
import { boxEstimate } from '../../lib/boxes.js';

export async function onRequestPost(context) {
  try {
    const { request } = context;
    let body;
    try {
      body = await request.json();
    } catch {
      throw new HttpError('VALIDATION', 'request body must be valid JSON');
    }
    const bedrooms = body && body.bedrooms;
    const result = boxEstimate(bedrooms); // throws HttpError('VALIDATION') if out of 1..10
    return ok(result);
  } catch (e) {
    return errorResponse(e);
  }
}
