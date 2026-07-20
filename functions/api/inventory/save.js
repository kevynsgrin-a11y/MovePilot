// functions/api/inventory/save.js
// SPEC §3 feature 10 + §5 (POST /api/inventory/save): persist a named inventory
// state. Totals are ALWAYS recomputed server-side (§6.1) — client-sent totals are
// never trusted. Ownership branches on the bearer (§4.5 / §5): a registered-user
// token owns owner_type='user'; an anonymous session token owns owner_type='session'.

import { ok, HttpError } from '../../lib/respond.js';
import { readJson } from '../../_middleware.js';
import { getSession } from '../../lib/auth.js';
import { getDb, id, now } from '../../lib/db.js';
import { CBM_PER_CUFT } from '../../lib/constants.js';
import { round } from '../../lib/round.js';

/**
 * Resolve the owner of an inventory operation from the bearer token.
 * Registered user → {owner_type:'user'}; anonymous session → {owner_type:'session'}.
 * Shared by save/list/[id] (duplicated per-handler; no cross-handler imports on Pages).
 */
export async function resolveOwner(request, env) {
  const ctx = await getSession(request, env);
  if (!ctx) {
    throw new HttpError('UNAUTHENTICATED', 'A valid session or user token is required.');
  }
  if (ctx.user) return { owner_type: 'user', owner_id: ctx.user.id, ctx };
  return { owner_type: 'session', owner_id: ctx.session.id, ctx };
}

/** Load the KV item-volume catalog (config:item_volumes, §4.3). Empty if unseeded. */
export async function loadItemTable(env) {
  if (!env || !env.MP_KV) return {};
  const raw = await env.MP_KV.get('config:item_volumes');
  return raw ? JSON.parse(raw) : {};
}

/**
 * Recompute inventory totals per §6.1:
 *   subtotal_i = quantity_i × volume_i ;  total_cuft = Σ subtotal
 *   total_cbm  = total_cuft × 0.0283168
 * Resolves volume from the KV catalog when a `key` is given (box keys included),
 * else uses the explicit `volume_cuft`. Throws 400 on empty/unknown/invalid input.
 * @returns {{total_cuft:number,total_cbm:number,line_items:object[]}}
 */
export function recomputeInventory(items, itemTable) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new HttpError('VALIDATION', 'items must be a non-empty array.');
  }
  const lineItems = [];
  let sumCuft = 0;
  for (const it of items) {
    const quantity = Number(it && it.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new HttpError('VALIDATION', 'Each item requires an integer quantity > 0.');
    }
    let volume;
    let key = it.key != null ? String(it.key) : null;
    let label = typeof it.label === 'string' ? it.label : null;
    if (key != null) {
      const entry = itemTable[key];
      if (!entry) throw new HttpError('VALIDATION', `Unknown item key: ${key}`);
      volume = Number(entry.volume_cuft);
      if (label == null) label = entry.label;
    } else {
      volume = Number(it.volume_cuft);
      if (!(volume > 0)) {
        throw new HttpError(
          'VALIDATION',
          'Each item needs a known key or a positive volume_cuft.'
        );
      }
      if (label == null) label = 'Custom item';
    }
    const subtotal = quantity * volume;
    sumCuft += subtotal;
    lineItems.push({
      key,
      label,
      quantity,
      volume_cuft: volume,
      subtotal_cuft: round(subtotal, 2),
    });
  }
  return {
    total_cuft: round(sumCuft, 2), // §6 rounding: cu ft → 2 decimals
    total_cbm: round(sumCuft * CBM_PER_CUFT, 4), // §6 rounding: CBM → 4 decimals
    line_items: lineItems,
  };
}

export async function onRequestPost({ request, env }) {
  const owner = await resolveOwner(request, env);
  const body = await readJson(request);
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) throw new HttpError('VALIDATION', 'A non-empty name is required.');

  const itemTable = await loadItemTable(env);
  const computed = recomputeInventory(body.items, itemTable);

  const db = getDb(env);
  const stateId = id();
  const ts = now();
  // Store normalized line items (key/label/quantity/volume_cuft) as items_json (§4.1).
  const itemsJson = JSON.stringify(
    computed.line_items.map((li) => ({
      key: li.key,
      label: li.label,
      quantity: li.quantity,
      volume_cuft: li.volume_cuft,
    }))
  );
  await db
    .prepare(
      `INSERT INTO inventory_states
         (id, owner_type, owner_id, name, items_json, total_cuft, total_cbm, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      stateId,
      owner.owner_type,
      owner.owner_id,
      name,
      itemsJson,
      computed.total_cuft,
      computed.total_cbm,
      ts,
      ts
    )
    .run();

  return ok(
    { id: stateId, total_cuft: computed.total_cuft, total_cbm: computed.total_cbm },
    201
  );
}
