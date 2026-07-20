// functions/api/vault/quotes.js  →  POST/GET /api/vault/quotes  (collection)
// SPEC §3 feature 14, §5 (Vault), §7.3. PREMIUM-gated: requirePremium → 402 if the
// authenticated user is not is_premium. Stores normalized numeric fields only — no
// raw PDF bytes (R2 not provisioned in v1; §2). Each stored quote is normalized to
// implied density + anomaly flag per §6.5.

import { ok, HttpError } from '../../lib/respond.js';
import { readJson } from '../../_middleware.js';
import { requirePremium } from '../../lib/auth.js';
import { getDb, id, now } from '../../lib/db.js';
import { round } from '../../lib/round.js';
import { quoteAnomaly } from '../../lib/quote.js';

/**
 * Normalize a quote's weight/volume into { implied_density, is_anomalous, anomaly_reason }.
 * Density/anomaly (§6.5) are only computed when BOTH weight and volume are positive;
 * otherwise the quote is stored with a null density and not flagged anomalous.
 */
export function normalizeQuote(weightLbs, volumeCuft) {
  const w = weightLbs == null ? null : Number(weightLbs);
  const v = volumeCuft == null ? null : Number(volumeCuft);
  if (w != null && v != null && Number.isFinite(w) && Number.isFinite(v) && w > 0 && v > 0) {
    const a = quoteAnomaly(w, v); // §6.5
    return {
      implied_density: a.implied_density,
      is_anomalous: a.is_anomalous ? 1 : 0,
      anomaly_reason: a.reason,
    };
  }
  return { implied_density: null, is_anomalous: 0, anomaly_reason: null };
}

/** Serialize a D1 vault_quotes row into an API quote object. */
export function serializeQuote(row) {
  return {
    id: row.id,
    mover_name: row.mover_name,
    mover_usdot: row.mover_usdot,
    quoted_price_usd: row.quoted_price_cents == null ? null : round(row.quoted_price_cents / 100, 2),
    quoted_weight_lbs: row.quoted_weight_lbs,
    quoted_volume_cuft: row.quoted_volume_cuft,
    implied_density: row.implied_density,
    is_anomalous: Number(row.is_anomalous) === 1,
    anomaly_reason: row.anomaly_reason,
    extracted_text: row.extracted_text,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function onRequestPost({ request, env }) {
  const { user } = await requirePremium(request, env); // 401/402 gate
  const body = await readJson(request);

  const moverName = typeof body.mover_name === 'string' ? body.mover_name.trim() : '';
  if (!moverName) throw new HttpError('VALIDATION', 'mover_name is required.');

  // Optional numeric fields. quoted_price_usd → cents (§4.1 money stored as cents).
  let priceCents = null;
  if (body.quoted_price_usd != null) {
    const p = Number(body.quoted_price_usd);
    if (!Number.isFinite(p) || p < 0) throw new HttpError('VALIDATION', 'quoted_price_usd must be a non-negative number.');
    priceCents = Math.round(p * 100);
  }
  const weightLbs = body.quoted_weight_lbs != null ? Number(body.quoted_weight_lbs) : null;
  const volumeCuft = body.quoted_volume_cuft != null ? Number(body.quoted_volume_cuft) : null;
  if (weightLbs != null && (!Number.isFinite(weightLbs) || weightLbs <= 0)) {
    throw new HttpError('VALIDATION', 'quoted_weight_lbs, when provided, must be a positive number.');
  }
  if (volumeCuft != null && (!Number.isFinite(volumeCuft) || volumeCuft <= 0)) {
    throw new HttpError('VALIDATION', 'quoted_volume_cuft, when provided, must be a positive number.');
  }

  const norm = normalizeQuote(weightLbs, volumeCuft);
  const rowId = id();
  const ts = now();
  const db = getDb(env);
  await db
    .prepare(
      `INSERT INTO vault_quotes
         (id, user_id, mover_name, mover_usdot, quoted_price_cents, quoted_weight_lbs,
          quoted_volume_cuft, implied_density, is_anomalous, anomaly_reason, extracted_text,
          created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      rowId,
      user.id,
      moverName,
      body.mover_usdot != null ? String(body.mover_usdot) : null,
      priceCents,
      weightLbs,
      volumeCuft,
      norm.implied_density,
      norm.is_anomalous,
      norm.anomaly_reason,
      typeof body.extracted_text === 'string' ? body.extracted_text : null,
      ts,
      ts
    )
    .run();

  return ok(
    { id: rowId, implied_density: norm.implied_density, is_anomalous: norm.is_anomalous === 1, anomaly_reason: norm.anomaly_reason },
    201
  );
}

export async function onRequestGet({ request, env }) {
  const { user } = await requirePremium(request, env); // 401/402 gate
  const db = getDb(env);
  const res = await db
    .prepare(`SELECT * FROM vault_quotes WHERE user_id = ? ORDER BY created_at DESC`)
    .bind(user.id)
    .all();
  return ok({ quotes: (res.results || []).map(serializeQuote) }, 200);
}
