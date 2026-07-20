// functions/api/vault/scenario.js  →  POST /api/vault/scenario
// SPEC §3 feature 15, §5 (Vault), §6.6. PREMIUM-gated (requirePremium → 402).
// Request: { distance_miles>0, labor_hours>=0, weight_lbs>0 }.
// Response: { scenarios:[{name,line_items:[{label,amount_usd}],total_usd}], ranked:[names cheapest-first] }.

import { ok } from '../../lib/respond.js';
import { readJson } from '../../_middleware.js';
import { requirePremium } from '../../lib/auth.js';
import { scenarioModel } from '../../lib/scenarios.js';

export async function onRequestPost({ request, env }) {
  await requirePremium(request, env); // 401/402 gate
  const body = await readJson(request);
  // scenarioModel validates inputs and throws VALIDATION on bad values (§6.6).
  const result = scenarioModel({
    distance_miles: Number(body.distance_miles),
    labor_hours: Number(body.labor_hours),
    weight_lbs: Number(body.weight_lbs),
  });
  return ok(result, 200);
}
