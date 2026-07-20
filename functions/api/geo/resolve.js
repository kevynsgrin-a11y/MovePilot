// functions/api/geo/resolve.js  →  GET /api/geo/resolve?zip=NNNNN
// SPEC §12.2 feature 25, §12.4, §12.6. No auth. ZIP-3 centroid lookup.
//   found:      200 { found:true, zip, zip3, lat, lng, city, state }
//   unseeded:   200 { found:false, zip }
//   malformed:  400 VALIDATION (zip is not exactly 5 digits)

import { ok, errorResponse, HttpError } from '../../lib/respond.js';
import { resolveZip } from '../../lib/geo.js';

export async function onRequestGet(context) {
  try {
    const { request, env } = context;
    const zip = new URL(request.url).searchParams.get('zip') || '';
    const r = await resolveZip(zip, env);
    // §12.6: malformed zip (not 5 digits) → 400; unseeded prefix → 200 found:false.
    if (r.malformed) {
      throw new HttpError('VALIDATION', 'zip must be exactly 5 digits.');
    }
    return ok(r);
  } catch (e) {
    return errorResponse(e);
  }
}
