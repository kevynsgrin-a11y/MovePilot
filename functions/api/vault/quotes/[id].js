// functions/api/vault/quotes/[id].js  →  GET/PUT/DELETE /api/vault/quotes/:id
// SPEC §3 feature 14, §5 (Vault). PREMIUM-gated (requirePremium → 402). Every op is
// scoped to the authenticated user's id: a row owned by another user resolves to 404
// (not 403) so ownership is never disclosed. PUT recomputes density/anomaly (§6.5).

import { ok, HttpError } from '../../../lib/respond.js';
import { readJson } from '../../../_middleware.js';
import { requirePremium } from '../../../lib/auth.js';
import { getDb, now } from '../../../lib/db.js';
import { normalizeQuote, serializeQuote } from '../quotes.js';

/** Fetch a quote scoped to the user, or throw 404. */
async function getOwnedQuote(env, userId, quoteId) {
  const db = getDb(env);
  const row = await db
    .prepare(`SELECT * FROM vault_quotes WHERE id = ? AND user_id = ?`)
    .bind(quoteId, userId)
    .first();
  if (!row) throw new HttpError('NOT_FOUND', 'Vault quote not found.');
  return row;
}

export async function onRequestGet({ request, env, params }) {
  const { user } = await requirePremium(request, env);
  const row = await getOwnedQuote(env, user.id, params.id);
  return ok(serializeQuote(row), 200);
}

export async function onRequestPut({ request, env, params }) {
  const { user } = await requirePremium(request, env);
  const row = await getOwnedQuote(env, user.id, params.id); // 404 if not owned
  const body = await readJson(request);

  // Merge partial fields onto the existing row.
  let moverName = row.mover_name;
  if (body.mover_name !== undefined) {
    if (typeof body.mover_name !== 'string' || body.mover_name.trim() === '') {
      throw new HttpError('VALIDATION', 'mover_name, when provided, must be non-empty.');
    }
    moverName = body.mover_name.trim();
  }

  let moverUsdot = row.mover_usdot;
  if (body.mover_usdot !== undefined) moverUsdot = body.mover_usdot != null ? String(body.mover_usdot) : null;

  let priceCents = row.quoted_price_cents;
  if (body.quoted_price_usd !== undefined) {
    if (body.quoted_price_usd === null) priceCents = null;
    else {
      const p = Number(body.quoted_price_usd);
      if (!Number.isFinite(p) || p < 0) throw new HttpError('VALIDATION', 'quoted_price_usd must be a non-negative number.');
      priceCents = Math.round(p * 100);
    }
  }

  let weightLbs = row.quoted_weight_lbs;
  if (body.quoted_weight_lbs !== undefined) {
    if (body.quoted_weight_lbs === null) weightLbs = null;
    else {
      weightLbs = Number(body.quoted_weight_lbs);
      if (!Number.isFinite(weightLbs) || weightLbs <= 0) throw new HttpError('VALIDATION', 'quoted_weight_lbs must be a positive number.');
    }
  }

  let volumeCuft = row.quoted_volume_cuft;
  if (body.quoted_volume_cuft !== undefined) {
    if (body.quoted_volume_cuft === null) volumeCuft = null;
    else {
      volumeCuft = Number(body.quoted_volume_cuft);
      if (!Number.isFinite(volumeCuft) || volumeCuft <= 0) throw new HttpError('VALIDATION', 'quoted_volume_cuft must be a positive number.');
    }
  }

  let extractedText = row.extracted_text;
  if (body.extracted_text !== undefined) {
    extractedText = typeof body.extracted_text === 'string' ? body.extracted_text : null;
  }

  // Recompute density/anomaly from the merged weight/volume (§6.5).
  const norm = normalizeQuote(weightLbs, volumeCuft);
  const db = getDb(env);
  const ts = now();
  await db
    .prepare(
      `UPDATE vault_quotes
          SET mover_name = ?, mover_usdot = ?, quoted_price_cents = ?, quoted_weight_lbs = ?,
              quoted_volume_cuft = ?, implied_density = ?, is_anomalous = ?, anomaly_reason = ?,
              extracted_text = ?, updated_at = ?
        WHERE id = ? AND user_id = ?`
    )
    .bind(
      moverName,
      moverUsdot,
      priceCents,
      weightLbs,
      volumeCuft,
      norm.implied_density,
      norm.is_anomalous,
      norm.anomaly_reason,
      extractedText,
      ts,
      row.id,
      user.id
    )
    .run();

  const updated = await getOwnedQuote(env, user.id, params.id);
  return ok(serializeQuote(updated), 200);
}

export async function onRequestDelete({ request, env, params }) {
  const { user } = await requirePremium(request, env);
  await getOwnedQuote(env, user.id, params.id); // 404 if not owned
  const db = getDb(env);
  await db.prepare(`DELETE FROM vault_quotes WHERE id = ? AND user_id = ?`).bind(params.id, user.id).run();
  return ok({ deleted: true }, 200);
}
