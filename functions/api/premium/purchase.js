// functions/api/premium/purchase.js  →  POST /api/premium/purchase
// SPEC §3 feature 13, §5 (Premium purchase), §7.3. Requires an authenticated USER.
// v1 MOCK PAYMENT — no real gateway (the only mock permitted by §11). Validates
// amount_usd ∈ [19.99, 29.99], then sets is_premium=1, premium_purchased_at=now,
// premium_amount_cents=round(amount×100). One-time pass — no expiry, no recurring bill.

import { ok, HttpError } from '../../lib/respond.js';
import { readJson } from '../../_middleware.js';
import { requireUser } from '../../lib/auth.js';
import { getDb, now } from '../../lib/db.js';
import { round } from '../../lib/round.js';
import { PREMIUM_MIN_USD, PREMIUM_MAX_USD } from '../../lib/constants.js';

export async function onRequestPost({ request, env }) {
  const { user } = await requireUser(request, env); // 401 if not a registered user
  const body = await readJson(request);

  const amount = Number(body.amount_usd);
  if (!Number.isFinite(amount) || amount < PREMIUM_MIN_USD || amount > PREMIUM_MAX_USD) {
    throw new HttpError('VALIDATION', `amount_usd must be between ${PREMIUM_MIN_USD} and ${PREMIUM_MAX_USD}.`);
  }
  const cents = Math.round(round(amount, 2) * 100); // store money as cents (§4.1)
  const ts = now();
  const db = getDb(env);
  await db
    .prepare(
      `UPDATE users
          SET is_premium = 1, premium_purchased_at = ?, premium_amount_cents = ?, updated_at = ?
        WHERE id = ?`
    )
    .bind(ts, cents, ts, user.id)
    .run();

  return ok({ is_premium: true, premium_purchased_at: ts }, 200);
}
