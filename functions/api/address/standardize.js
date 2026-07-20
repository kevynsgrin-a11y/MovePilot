// functions/api/address/standardize.js  →  POST /api/address/standardize
// SPEC §3 feature 12, §5 (Address/NCOA), §6.9. No auth (anonymous-friendly).
// Behavior (§5): if NCOA_PROVIDER_KEY is set, call the provider and meter usage
// (ncoalink, cost_cents += 1 = $0.01/record); otherwise run the deterministic
// standardizeAddressFallback(). Always append the static UTILITY_CHECKLIST.

import { ok, errorResponse, HttpError } from '../../lib/respond.js';
import { readJson } from '../../_middleware.js';
import { standardizeAddressFallback, UTILITY_CHECKLIST } from '../../lib/address.js';
import { incrementApiUsage } from '../../lib/usage.js';

/**
 * Provider (NCOALink) standardization path. Only reached when NCOA_PROVIDER_KEY is set
 * (never in tests, which run the fallback path). Maps the provider response into the
 * same {street,city,state,zip,zip4?} shape as the fallback.
 * @throws {HttpError} UPSTREAM on network / non-2xx failure.
 */
async function standardizeViaProvider(env, addr) {
  const url = 'https://api.ncoalink.example/v1/standardize';
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.NCOA_PROVIDER_KEY}`,
      },
      body: JSON.stringify(addr),
    });
  } catch (e) {
    throw new HttpError('UPSTREAM', `NCOA provider request failed: ${e && e.message}`);
  }
  if (!res.ok) throw new HttpError('UPSTREAM', `NCOA provider returned HTTP ${res.status}`);
  const j = await res.json();
  const out = {
    street: j.street,
    city: j.city,
    state: j.state,
    zip: j.zip,
  };
  if (j.zip4) out.zip4 = j.zip4;
  return out;
}

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await readJson(request);

    // §5: missing fields → 400 (fallback also enforces this; validate up front for both paths).
    const { street, city, state, zip } = body || {};
    if (!street || !city || !state || (zip === undefined || zip === null || zip === '')) {
      throw new HttpError('VALIDATION', 'street, city, state, and zip are all required.');
    }

    let standardized;
    let provider;
    if (env && env.NCOA_PROVIDER_KEY) {
      // Provider path overrides the fallback (§6.9); meter the paid call (§5).
      standardized = await standardizeViaProvider(env, { street, city, state, zip });
      provider = 'ncoalink';
      await incrementApiUsage(env, 'ncoalink', 1); // $0.01/record
    } else {
      // Deterministic fallback (no external call, no metering).
      standardized = standardizeAddressFallback({ street, city, state, zip });
      provider = 'fallback';
    }

    return ok({ standardized, provider, utility_checklist: UTILITY_CHECKLIST });
  } catch (e) {
    return errorResponse(e);
  }
}
