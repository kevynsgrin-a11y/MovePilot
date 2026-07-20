// functions/lib/affiliates.js
// Affiliate partner registry + tracked-URL builder (SPEC §7.2). This file is the
// SINGLE SOURCE OF TRUTH for partner base URLs and tracking params. A click gets a
// generated click_id; the partner params, click_id, and the caller context (as
// mp_ctx) are appended to the base URL. Bases end with "?" so the query string is
// concatenated directly.

/** @type {Record<string,{base:string, params:Record<string,string>, note:string}>} */
export const PARTNERS = Object.freeze({
  hireahelper: {
    base: 'https://www.hireahelper.com/?',
    params: { aff_id: 'movepilot', utm_source: 'movepilot', utm_medium: 'affiliate', utm_campaign: 'labor' },
    note: 'Commission on booked labor via HireAHelper API.',
  },
  packaging: {
    base: 'https://packaging.example-partner.com/?',
    params: { ref: 'movepilot', utm_source: 'movepilot', utm_medium: 'affiliate', utm_campaign: 'boxes' },
    note: 'Packing-supplies partner.',
  },
  utility: {
    base: 'https://citizenhomesolutions.example/?',
    params: { partner: 'movepilot', utm_source: 'movepilot', utm_medium: 'affiliate', utm_campaign: 'utilities' },
    note: 'Citizen Home Solutions utility transfer.',
  },
  truck: {
    base: 'https://trucks.example-partner.com/?',
    params: { ref: 'movepilot', utm_source: 'movepilot', utm_medium: 'affiliate', utm_campaign: 'truck' },
    note: 'Truck-rental partner.',
  },
});

/** The set of valid partner keys. */
export const PARTNER_KEYS = Object.freeze(Object.keys(PARTNERS));

/** @param {string} partner @returns {boolean} */
export function isValidPartner(partner) {
  return Object.prototype.hasOwnProperty.call(PARTNERS, partner);
}

/**
 * Build the tracked partner redirect URL.
 * @param {string} partner one of PARTNER_KEYS
 * @param {string} clickId generated tracking id (crypto.randomUUID())
 * @param {string} [context] caller context, appended as mp_ctx
 * @returns {string|null} the full URL, or null for an unknown partner
 */
export function buildAffiliateUrl(partner, clickId, context) {
  const p = PARTNERS[partner];
  if (!p) return null;
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(p.params)) usp.set(k, v);
  usp.set('click_id', clickId);
  if (context) usp.set('mp_ctx', context);
  return p.base + usp.toString();
}
