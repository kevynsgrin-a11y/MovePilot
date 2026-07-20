// functions/api/affiliate/go.js  →  GET /api/affiliate/go?partner=&context=
// SPEC §3 feature 18, §5 (Affiliate & ad), §7.2. Optional Bearer. Logs the click
// (same as POST /api/affiliate/click) then issues a 302 redirect to the tracked
// partner URL. Unknown/missing partner → 400.

import { err, errorResponse, HttpError } from '../../lib/respond.js';
import { logAffiliateClick } from './click.js';
import { CORS_HEADERS } from '../../lib/respond.js';

export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const partner = url.searchParams.get('partner') || '';
    const context = url.searchParams.get('context') || undefined;
    if (!partner) throw new HttpError('VALIDATION', 'partner query parameter is required.');
    const { redirectUrl } = await logAffiliateClick(env, request, partner, context);
    return new Response(null, {
      status: 302,
      headers: { Location: redirectUrl, ...CORS_HEADERS },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
