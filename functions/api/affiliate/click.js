// functions/api/affiliate/click.js  →  POST /api/affiliate/click
// SPEC §3 feature 18, §5 (Affiliate & ad), §7.2. Optional Bearer. Generates a
// click_id, builds the tracked partner URL (functions/lib/affiliates.js — single
// source of truth), logs an affiliate_clicks row (with the owner if a bearer token
// is present), and returns { click_id, redirect_url }. Unknown partner → 400.

import { ok, HttpError } from '../../lib/respond.js';
import { readJson } from '../../_middleware.js';
import { getSession } from '../../lib/auth.js';
import { getDb, id, now } from '../../lib/db.js';
import { isValidPartner, buildAffiliateUrl } from '../../lib/affiliates.js';

/** Resolve optional owner from a (possibly absent) bearer token. */
export async function resolveOptionalOwner(request, env) {
  const ctx = await getSession(request, env);
  if (ctx && ctx.user) return { owner_type: 'user', owner_id: ctx.user.id };
  if (ctx && ctx.session) return { owner_type: 'session', owner_id: ctx.session.id };
  return { owner_type: null, owner_id: null };
}

/** Log a click row and return the generated click_id + tracked redirect URL. */
export async function logAffiliateClick(env, request, partner, context) {
  if (!isValidPartner(partner)) throw new HttpError('VALIDATION', `Unknown affiliate partner: ${partner}`);
  const clickId = id();
  const redirectUrl = buildAffiliateUrl(partner, clickId, context);
  const owner = await resolveOptionalOwner(request, env);
  const db = getDb(env);
  await db
    .prepare(
      `INSERT INTO affiliate_clicks
         (id, click_id, partner, target_url, route_context, owner_type, owner_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(id(), clickId, partner, redirectUrl, context || null, owner.owner_type, owner.owner_id, now())
    .run();
  return { clickId, redirectUrl };
}

export async function onRequestPost({ request, env }) {
  const body = await readJson(request);
  const partner = typeof body.partner === 'string' ? body.partner : '';
  const context = typeof body.context === 'string' ? body.context : undefined;
  const { clickId, redirectUrl } = await logAffiliateClick(env, request, partner, context);
  return ok({ click_id: clickId, redirect_url: redirectUrl }, 200);
}
