// functions/lib/leads.js
// SPEC §7.3 Phase-3 validated-lead guard. NO lead-selling endpoint ships in v1;
// this pure guard exists (and is unit-tested) so Phase 3 can wire it in.
//
// Rule: a lead may only be forwarded to a carrier if parseFmcsaRecord() reports
//   authorized_for_hhg === true  AND  meets_750k_minimum === true.
//
// Resolution: read the cached SAFER record from KV (`fmcsa:usdot:<n>`, §4.3 shape
//   { raw, parsed, fetched_at, source }) and evaluate its parsed flags. On a KV miss
//   fall back to fetchAndCacheFmcsa() (dynamically imported so this guard has no
//   hard build-time dependency on fmcsa.js and stays independently unit-testable).

/**
 * True only when the resolved carrier is FMCSA-authorized for interstate HHG AND
 * carries at least the federal $750k liability minimum. Any unresolved/unknown
 * carrier is ineligible (returns false).
 * @param {string} usdot USDOT number
 * @param {object} env Pages/Worker env (MP_KV, optional FMCSA_WEBKEY)
 * @returns {Promise<boolean>}
 */
export async function isLeadEligible(usdot, env) {
  if (usdot == null || String(usdot).trim() === '') return false;
  const key = `fmcsa:usdot:${usdot}`;

  // Path 1: KV cache hit — evaluate the cached parsed record.
  let parsed = null;
  if (env && env.MP_KV) {
    const raw = await env.MP_KV.get(key);
    if (raw) {
      try {
        const record = JSON.parse(raw);
        parsed = record && record.parsed ? record.parsed : null;
      } catch {
        parsed = null;
      }
    }
  }

  // Path 2: KV miss — fall back to fetch-and-cache (only if fmcsa.js is available).
  if (!parsed) {
    try {
      const { fetchAndCacheFmcsa } = await import('./fmcsa.js');
      const fetched = await fetchAndCacheFmcsa(env, { usdot });
      parsed = fetched && fetched.parsed ? fetched.parsed : fetched || null;
    } catch {
      parsed = null;
    }
  }

  if (!parsed) return false;
  return parsed.authorized_for_hhg === true && parsed.meets_750k_minimum === true;
}
