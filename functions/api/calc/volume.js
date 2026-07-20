// functions/api/calc/volume.js  →  POST /api/calc/volume
// SPEC §3 feature 1, §5 (Calculators), §6.1. No auth (anonymous-friendly).
// Resolves `key` line items against the KV `config:item_volumes` catalog (which also
// contains the small/medium/large box keys), then computes total cuft/CBM via §6.1.

import { ok, errorResponse, HttpError } from '../../lib/respond.js';
import { computeVolume } from '../../lib/volume.js';

/** Load the item-volume catalog from KV (edge-local, seeded from seed/item_volumes.json). */
async function loadItemTable(env) {
  if (!env || !env.MP_KV) return {};
  const table = await env.MP_KV.get('config:item_volumes', 'json');
  return table || {};
}

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    let body;
    try {
      body = await request.json();
    } catch {
      throw new HttpError('VALIDATION', 'request body must be valid JSON');
    }
    const items = body && body.items;
    const itemTable = await loadItemTable(env);
    const result = computeVolume(items, itemTable); // throws HttpError('VALIDATION') on bad input
    return ok(result);
  } catch (e) {
    return errorResponse(e);
  }
}
