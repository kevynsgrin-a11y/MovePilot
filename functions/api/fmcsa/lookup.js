// functions/api/fmcsa/lookup.js  →  GET /api/fmcsa/lookup
// SPEC §3 feature 6, §5 (FMCSA), §6.8. No auth (anonymous-friendly SEO asset).
// Query MUST carry exactly one of ?usdot=<n> or ?mc=<n>. Behavior (§5): KV cache-first
// via fetchAndCacheFmcsa(); returns the parsed report + source + fetched_at, or
// {found:false, reason} when not verifiable. Upstream failures surface as 502.

import { ok, errorResponse, HttpError } from '../../lib/respond.js';
import { fetchAndCacheFmcsa } from '../../lib/fmcsa.js';
import { FMCSA_SOURCE } from '../../lib/constants.js';
import { now } from '../../lib/db.js';

export async function onRequestGet(context) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const usdot = url.searchParams.get('usdot');
    const mc = url.searchParams.get('mc');

    // §5: exactly one of usdot / mc.
    const hasUsdot = usdot != null && usdot !== '';
    const hasMc = mc != null && mc !== '';
    if (hasUsdot === hasMc) {
      throw new HttpError('VALIDATION', 'Provide exactly one of ?usdot= or ?mc=.');
    }

    const sel = hasUsdot ? { usdot: String(usdot) } : { mc: String(mc) };
    const data = await fetchAndCacheFmcsa(env, sel); // may throw UPSTREAM (→ 502)
    return ok(data);
  } catch (e) {
    // §5: on upstream failure include a stale-cache note alongside the 502 envelope.
    if (e instanceof HttpError && e.code === 'UPSTREAM') {
      return errorResponse(
        new HttpError(
          'UPSTREAM',
          `${e.message} No cached record was available to serve as a fallback. (source: ${FMCSA_SOURCE}, checked_at: ${now()})`
        )
      );
    }
    return errorResponse(e);
  }
}
