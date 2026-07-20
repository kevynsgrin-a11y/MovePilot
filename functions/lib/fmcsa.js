// functions/lib/fmcsa.js
// SPEC §5 (FMCSA), §6.8 (FMCSA record parsing), §3 feature 6.
// Two responsibilities:
//   • parseFmcsaRecord(raw) — pure map of a SAFER-shaped object → plain-English report.
//   • fetchAndCacheFmcsa(env, {usdot|mc}) — KV cache-first lookup; on miss + FMCSA_WEBKEY
//     set, fetch SAFER, parse, cache 7d, meter usage; on miss + no key, not_cached.
// Data provenance (§1 principle 3): every response carries source + fetched_at.
// Cloudflare Workers runtime ONLY (global fetch, KV, crypto). No Node APIs.

import { FMCSA_LIABILITY_MINIMUM_USD, FMCSA_SOURCE, FMCSA_KV_TTL_SECONDS } from './constants.js';
import { HttpError } from './respond.js';
import { now } from './db.js';
import { incrementApiUsage } from './usage.js';

/**
 * Map a SAFER-shaped raw record to the plain-English safety report (§6.8).
 * Rules (verbatim §6.8):
 *   authorized_for_hhg = operating_status matches /AUTHORIZED/i AND
 *                        carrier_operation includes HHG/Property
 *   meets_750k_minimum = Number(bipd_insurance_on_file) >= 750000
 * @param {object} raw
 * @returns {{found:true,carrier_name:string|null,usdot:string|null,mc:string|null,
 *   operating_status:string,authorized_for_hhg:boolean,insurance_on_file_usd:number|null,
 *   meets_750k_minimum:boolean,crash_total:*,inspection_total:*,plain_english:string[]}}
 */
export function parseFmcsaRecord(raw) {
  const r = raw || {};
  const operating_status = r.operating_status != null ? String(r.operating_status) : '';
  const carrier_operation = r.carrier_operation != null ? String(r.carrier_operation) : '';

  // §6.8: both conditions must hold. "NOT AUTHORIZED" still contains AUTHORIZED, so
  // the carrier_operation HHG/Property check is what excludes non-HHG carriers.
  const authorized_for_hhg =
    /AUTHORIZED/i.test(operating_status) && /HHG|Property/i.test(carrier_operation);

  // §6.8: federal $750k liability minimum. Number('') === 0, so an empty value fails.
  const insuranceRaw = r.bipd_insurance_on_file;
  const insurance_on_file_usd =
    insuranceRaw == null || insuranceRaw === '' ? null : Number(insuranceRaw);
  const meets_750k_minimum = Number(insuranceRaw) >= FMCSA_LIABILITY_MINIMUM_USD;

  const plain_english = [
    authorized_for_hhg
      ? '✅ Authorized for interstate household-goods transport.'
      : '⚠️ NOT authorized for interstate HHG transport — do not hire for an interstate move.',
    meets_750k_minimum
      ? '✅ Carries at least the federal $750,000 liability minimum.'
      : '⚠️ Liability insurance on file is below the $750,000 federal minimum.',
    `Crashes on record (24 mo): ${r.crash_total ?? 'unknown'}.`,
    `Inspections on record: ${r.inspection_total ?? 'unknown'}.`,
  ];

  return {
    found: true,
    carrier_name: r.legal_name != null ? String(r.legal_name) : null,
    usdot: r.usdot != null ? String(r.usdot) : null,
    mc: r.mc != null ? String(r.mc) : null,
    operating_status,
    authorized_for_hhg,
    insurance_on_file_usd,
    meets_750k_minimum,
    crash_total: r.crash_total ?? null,
    inspection_total: r.inspection_total ?? null,
    plain_english,
  };
}

/** KV key for a cached record (§4.3): fmcsa:usdot:<n> | fmcsa:mc:<n>. */
function kvKey({ usdot, mc }) {
  return usdot != null ? `fmcsa:usdot:${usdot}` : `fmcsa:mc:${mc}`;
}

/**
 * Fetch a raw SAFER carrier record via the FMCSA QCMobile API. Only reached when
 * FMCSA_WEBKEY is set (never in tests, which run cache-only). Maps the QCMobile
 * carrier shape into the raw shape parseFmcsaRecord() expects.
 * @throws {HttpError} UPSTREAM on network / non-2xx failure.
 */
async function fetchSaferRaw(env, { usdot, mc }) {
  const base = 'https://mobile.fmcsa.dot.gov/qc/services/carriers';
  const key = encodeURIComponent(env.FMCSA_WEBKEY);
  const url =
    usdot != null
      ? `${base}/${encodeURIComponent(usdot)}?webKey=${key}`
      : `${base}/docket-number/${encodeURIComponent(mc)}?webKey=${key}`;

  let res;
  try {
    res = await fetch(url, { headers: { Accept: 'application/json' } });
  } catch (e) {
    throw new HttpError('UPSTREAM', `FMCSA SAFER request failed: ${e && e.message}`);
  }
  if (!res.ok) throw new HttpError('UPSTREAM', `FMCSA SAFER returned HTTP ${res.status}`);
  const json = await res.json();

  // QCMobile wraps the carrier under content (object) or content[0] (docket search array).
  const content = json && json.content;
  const carrier =
    (content && (Array.isArray(content) ? content[0] && content[0].carrier : content.carrier)) || {};

  return {
    legal_name: carrier.legalName ?? carrier.dbaName ?? null,
    usdot: carrier.dotNumber != null ? String(carrier.dotNumber) : usdot != null ? String(usdot) : null,
    mc: mc != null ? String(mc) : null,
    operating_status:
      carrier.allowedToOperate === 'Y'
        ? 'AUTHORIZED'
        : carrier.statusCode || carrier.operatingStatus || 'NOT AUTHORIZED',
    carrier_operation:
      (carrier.carrierOperation && carrier.carrierOperation.carrierOperationDesc) || '',
    bipd_insurance_on_file: carrier.bipdInsuranceOnFile ?? null,
    crash_total: carrier.crashTotal ?? null,
    inspection_total: carrier.driverInsp ?? carrier.vehicleInsp ?? null,
  };
}

/**
 * KV-cache-first FMCSA lookup (§5 FMCSA behavior).
 *   1. KV hit  → return cached parsed report (+ its stored source/fetched_at).
 *   2. Miss + FMCSA_WEBKEY set → fetch SAFER, parse, cache 7d, meter usage, return.
 *   3. Miss + no key → { found:false, reason:'not_cached', ... } (cache-only mode).
 * Always returns source + fetched_at.
 * @param {object} env @param {{usdot?:string,mc?:string}} sel
 * @returns {Promise<object>} the response `data` object
 */
export async function fetchAndCacheFmcsa(env, sel) {
  const kv = env && env.MP_KV;
  const key = kvKey(sel);

  // 1. Cache hit — parsed report already computed; carry stored provenance.
  if (kv) {
    const cachedRaw = await kv.get(key);
    if (cachedRaw) {
      const cached = JSON.parse(cachedRaw);
      const parsed = cached.parsed || parseFmcsaRecord(cached.raw);
      return {
        ...parsed,
        source: cached.source || FMCSA_SOURCE,
        fetched_at: cached.fetched_at || now(),
      };
    }
  }

  // 2/3. Miss.
  if (!env || !env.FMCSA_WEBKEY) {
    // Cache-only mode: no live key, so nothing to verify.
    return { found: false, reason: 'not_cached', source: FMCSA_SOURCE, fetched_at: now() };
  }

  // 2. Live fetch + cache.
  const raw = await fetchSaferRaw(env, sel);
  const parsed = parseFmcsaRecord(raw);
  const fetched_at = now();
  const record = { raw, parsed, fetched_at, source: FMCSA_SOURCE };
  if (kv) {
    await kv.put(key, JSON.stringify(record), { expirationTtl: FMCSA_KV_TTL_SECONDS });
    // Also index by USDOT if we resolved one via MC lookup, so future usdot hits are cached.
    if (sel.mc != null && parsed.usdot) {
      await kv.put(`fmcsa:usdot:${parsed.usdot}`, JSON.stringify(record), {
        expirationTtl: FMCSA_KV_TTL_SECONDS,
      });
    }
  }
  await incrementApiUsage(env, 'fmcsa', 0); // §5: meter the external SAFER call
  return { ...parsed, source: FMCSA_SOURCE, fetched_at };
}
