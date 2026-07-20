// functions/api/inventory/[id].js
// SPEC §3 feature 10 + §5 (GET/PUT/DELETE /api/inventory/:id): load, update, delete
// a single saved inventory state. Every operation is scoped to the caller's owner
// (user OR anon session, §4.5): a row not owned by the caller resolves to 404 (not
// 403) so ownership is never disclosed.

import { ok, HttpError } from '../../lib/respond.js';
import { readJson } from '../../_middleware.js';
import { getDb, now } from '../../lib/db.js';
import { resolveOwner, loadItemTable, recomputeInventory } from './save.js';

/** Fetch a state row scoped to the owner, or throw 404. */
async function getOwnedState(env, owner, stateId) {
  const db = getDb(env);
  const row = await db
    .prepare(
      `SELECT * FROM inventory_states WHERE id = ? AND owner_type = ? AND owner_id = ?`
    )
    .bind(stateId, owner.owner_type, owner.owner_id)
    .first();
  if (!row) throw new HttpError('NOT_FOUND', 'Inventory state not found.');
  return row;
}

export async function onRequestGet({ request, env, params }) {
  const owner = await resolveOwner(request, env);
  const row = await getOwnedState(env, owner, params.id);
  return ok(
    {
      id: row.id,
      name: row.name,
      items: JSON.parse(row.items_json),
      total_cuft: row.total_cuft,
      total_cbm: row.total_cbm,
      created_at: row.created_at,
      updated_at: row.updated_at,
    },
    200
  );
}

export async function onRequestPut({ request, env, params }) {
  const owner = await resolveOwner(request, env);
  const row = await getOwnedState(env, owner, params.id); // 404 if not owned
  const body = await readJson(request);

  // name is optional; when provided it must be non-empty.
  let name = row.name;
  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.trim() === '') {
      throw new HttpError('VALIDATION', 'name, when provided, must be non-empty.');
    }
    name = body.name.trim();
  }

  // items is optional; when provided, totals are recomputed server-side (§6.1).
  let itemsJson = row.items_json;
  let totalCuft = row.total_cuft;
  let totalCbm = row.total_cbm;
  if (body.items !== undefined) {
    const itemTable = await loadItemTable(env);
    const computed = recomputeInventory(body.items, itemTable);
    itemsJson = JSON.stringify(
      computed.line_items.map((li) => ({
        key: li.key,
        label: li.label,
        quantity: li.quantity,
        volume_cuft: li.volume_cuft,
      }))
    );
    totalCuft = computed.total_cuft;
    totalCbm = computed.total_cbm;
  }

  const db = getDb(env);
  const ts = now();
  await db
    .prepare(
      `UPDATE inventory_states
          SET name = ?, items_json = ?, total_cuft = ?, total_cbm = ?, updated_at = ?
        WHERE id = ? AND owner_type = ? AND owner_id = ?`
    )
    .bind(name, itemsJson, totalCuft, totalCbm, ts, row.id, owner.owner_type, owner.owner_id)
    .run();

  return ok({ id: row.id, total_cuft: totalCuft, total_cbm: totalCbm }, 200);
}

export async function onRequestDelete({ request, env, params }) {
  const owner = await resolveOwner(request, env);
  await getOwnedState(env, owner, params.id); // 404 if not owned
  const db = getDb(env);
  await db
    .prepare(
      `DELETE FROM inventory_states WHERE id = ? AND owner_type = ? AND owner_id = ?`
    )
    .bind(params.id, owner.owner_type, owner.owner_id)
    .run();
  return ok({ deleted: true }, 200);
}
