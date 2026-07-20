// functions/lib/usage.js
// Third-party API usage meter (admin cost monitoring, SPEC §4.1 api_usage,
// §5 admin/api-usage). One row per (provider, day); each external call increments
// `calls` by 1 and adds `cost_cents`. Uses an UPSERT on the UNIQUE(provider, day)
// constraint so concurrent increments accumulate.

import { id, now, today } from './db.js';
import { getDb } from './db.js';

/**
 * Increment the usage meter for a provider on today's UTC day.
 * @param {object} env
 * @param {'ncoalink'|'fmcsa'|'hireahelper'|'sms'|string} provider
 * @param {number} [costCents=0] cost to add for this call, in USD cents
 * @param {number} [calls=1] number of calls to add
 * @returns {Promise<void>}
 */
export async function incrementApiUsage(env, provider, costCents = 0, calls = 1) {
  const db = getDb(env);
  const day = today();
  // Upsert: insert a fresh row, or accumulate onto the existing (provider,day) row.
  await db
    .prepare(
      `INSERT INTO api_usage (id, provider, day, calls, cost_cents)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(provider, day) DO UPDATE SET
         calls = calls + excluded.calls,
         cost_cents = cost_cents + excluded.cost_cents`
    )
    .bind(id(), provider, day, calls, costCents)
    .run();
}

// Re-export time helpers callers commonly need alongside usage writes.
export { now, today };
