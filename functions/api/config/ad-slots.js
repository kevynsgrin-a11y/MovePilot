// functions/api/config/ad-slots.js  →  GET /api/config/ad-slots
// SPEC §3 feature 19, §5 (Affiliate & ad), §7.1. No auth. Serves the ad-slot config
// from KV (config:ad_slots, seeded from seed/ad_slots.json). Disabled slots are still
// returned with enabled:false so the frontend can gate rendering.

import { ok } from '../../lib/respond.js';

/** Fallback matching seed/ad_slots.json (§7.1) if KV is unseeded, so the surface always answers. */
const DEFAULT_AD_SLOTS = [
  { id: 'route_top', placement: 'route_page_header', size: '728x90', enabled: true },
  { id: 'route_inline', placement: 'route_page_body', size: '300x250', enabled: true },
  { id: 'calc_sidebar', placement: 'calculator_sidebar', size: '300x600', enabled: false },
  { id: 'timeline_footer', placement: 'timeline_footer', size: '728x90', enabled: true },
];

export async function onRequestGet({ env }) {
  let slots = DEFAULT_AD_SLOTS;
  if (env && env.MP_KV) {
    const raw = await env.MP_KV.get('config:ad_slots');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) slots = parsed;
      } catch {
        /* fall back to defaults on malformed KV */
      }
    }
  }
  return ok({ slots }, 200);
}
