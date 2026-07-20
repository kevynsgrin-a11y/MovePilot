// worker/index.js — MovePilot COMPANION WORKER (SPEC §2, §4.4, §8).
//
// Cloudflare Pages Functions can host ONLY HTTP handlers (`onRequest`); they cannot
// host a Queue consumer or cron `scheduled()` handler. This companion Worker is the
// second deploy target in the repo. It binds the SAME D1 (MP_DB) and KV (MP_KV) as the
// Pages project and does the background/scheduled work:
//
//   • queue(batch, env)      — consumes `fmcsa_refresh` messages: refreshes the SAFER
//                              record into KV (reusing functions/lib/fmcsa.js) and
//                              updates the `ingest_log` run row (§2, §4.4, §9.5).
//   • scheduled(event, env)  — two crons keyed off event.cron (§2, §8):
//       (a) "0 8 * * 1"     weekly → enqueue the SAFER re-ingest batch onto the
//                            MP_FMCSA_INGEST queue (producer) for every cached carrier.
//       (b) "*/15 * * * *"  every 15 min → scan D1 `alerts` WHERE send_at <= now AND
//                            status='scheduled', dispatch SMS (or mark sent as a no-op
//                            when SMS_PROVIDER_KEY is unset), and update status.
//
// Cloudflare Workers runtime ONLY — Web Crypto / global fetch / env bindings. No Node APIs.
// All shared logic is imported from the plain-ESM functions/lib/* modules so the exact
// same FMCSA parsing / D1 / usage-metering code runs here and in Pages Functions + tests.

import { fetchAndCacheFmcsa } from '../functions/lib/fmcsa.js';
import { all, run, id, now } from '../functions/lib/db.js';
import { incrementApiUsage } from '../functions/lib/usage.js';

// Cron identifiers (must match worker/wrangler.toml [triggers] crons).
export const WEEKLY_CRON = '0 8 * * 1'; // Mondays 08:00 UTC — SAFER re-ingest
export const ALERTS_CRON = '*/15 * * * *'; // every 15 min — SMS alert dispatch

const FMCSA_USDOT_KV_PREFIX = 'fmcsa:usdot:';

// ---------------------------------------------------------------------------
// Queue consumer — fmcsa_refresh (§4.4 message shape, §9.5)
// ---------------------------------------------------------------------------

/**
 * Refresh a single carrier's SAFER record into KV.
 *
 * fetchAndCacheFmcsa() is cache-FIRST: on a KV hit it returns the cached record
 * WITHOUT re-fetching. For a genuine re-ingest we want fresh upstream data, so when a
 * live FMCSA_WEBKEY is configured we drop the cached key first, forcing a re-fetch that
 * re-writes KV (and meters the call). In cache-only mode (no webkey) we intentionally
 * do NOT delete — there is nothing to re-fetch, so we simply confirm the existing cache
 * (a data-loss-free no-op refresh).
 *
 * @param {object} env
 * @param {string} usdot
 * @returns {Promise<object>} the FMCSA response `data` object (found:true|false)
 */
export async function refreshFmcsaRecord(env, usdot) {
  if (env && env.FMCSA_WEBKEY && env.MP_KV) {
    await env.MP_KV.delete(`${FMCSA_USDOT_KV_PREFIX}${usdot}`);
  }
  return fetchAndCacheFmcsa(env, { usdot });
}

/**
 * Handle one `fmcsa_refresh` message body. Pure-ish: touches only KV via fetchAndCacheFmcsa.
 * @param {{type?:string,usdot?:string,ingest_run_id?:string}} body
 * @param {object} env
 * @returns {Promise<{ok:boolean,usdot:string,found:boolean,reason?:string}>}
 */
export async function handleFmcsaRefresh(body, env) {
  if (!body || body.type !== 'fmcsa_refresh') {
    return { ok: false, usdot: '', found: false, reason: 'unknown_message_type' };
  }
  const usdot = body.usdot != null ? String(body.usdot) : '';
  if (!usdot) return { ok: false, usdot, found: false, reason: 'missing_usdot' };

  const record = await refreshFmcsaRecord(env, usdot);
  const found = record && record.found !== false;
  // A cache-only miss (found:false) is a terminal skip, not a transient failure — it is
  // recorded as an error in the ingest run but the message is acked (not retried).
  return { ok: !!found, usdot, found: !!found, reason: found ? undefined : (record && record.reason) || 'not_found' };
}

/**
 * Upsert the ingest_log run row for a batch's contribution to one ingest_run_id.
 * INSERT-or-accumulate so a run spanning multiple queue batches sums correctly
 * (records_processed / errors add up; status is recomputed from the cumulative totals).
 * @param {object} env
 * @param {string} ingestRunId
 * @param {number} processed messages attempted in this batch for the run
 * @param {number} errors    failures in this batch for the run
 */
export async function upsertIngestLog(env, ingestRunId, processed, errors) {
  const runId = ingestRunId || id(); // defensive: messages should always carry ingest_run_id
  // Per-batch status; the CASE in DO UPDATE recomputes from cumulative totals on conflict.
  const status = errors === 0 ? 'success' : processed > errors ? 'partial' : 'failed';
  const detail = `Refreshed ${processed} carrier(s), ${errors} error(s).`;
  await run(
    env,
    `INSERT INTO ingest_log (id, source, run_at, records_processed, errors, status, detail)
     VALUES (?, 'fmcsa_safer', ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       run_at = excluded.run_at,
       records_processed = ingest_log.records_processed + excluded.records_processed,
       errors = ingest_log.errors + excluded.errors,
       status = CASE
         WHEN (ingest_log.errors + excluded.errors) = 0 THEN 'success'
         WHEN (ingest_log.records_processed + excluded.records_processed)
              > (ingest_log.errors + excluded.errors) THEN 'partial'
         ELSE 'failed'
       END,
       detail = excluded.detail`,
    runId,
    now(),
    processed,
    errors,
    status,
    detail
  );
}

/**
 * Consume a queue batch of fmcsa_refresh messages. For each message it refreshes the
 * SAFER record into KV and tallies per-run results, then writes one ingest_log upsert
 * per ingest_run_id. Each message is ack()'d when handled (even a terminal not_found);
 * an unexpected exception triggers retry() so Queues redelivers it.
 * @param {{messages:Array<{body:object,ack?:Function,retry?:Function}>}} batch
 * @param {object} env
 * @returns {Promise<Map<string,{processed:number,errors:number}>>} per-run tallies
 */
export async function consumeQueueBatch(batch, env) {
  const messages = (batch && batch.messages) || [];
  /** @type {Map<string,{processed:number,errors:number}>} */
  const runTallies = new Map();

  for (const msg of messages) {
    const body = msg && msg.body;
    const runId = (body && body.ingest_run_id) || '';
    const tally = runTallies.get(runId) || { processed: 0, errors: 0 };
    try {
      const result = await handleFmcsaRefresh(body, env);
      tally.processed += 1;
      if (!result.ok) tally.errors += 1;
      if (msg && typeof msg.ack === 'function') msg.ack();
    } catch (e) {
      // Transient/unexpected failure (e.g. UPSTREAM fetch error): count it and retry.
      tally.processed += 1;
      tally.errors += 1;
      if (msg && typeof msg.retry === 'function') msg.retry();
    }
    runTallies.set(runId, tally);
  }

  for (const [runId, tally] of runTallies) {
    await upsertIngestLog(env, runId, tally.processed, tally.errors);
  }
  return runTallies;
}

// ---------------------------------------------------------------------------
// Scheduled — weekly SAFER re-ingest producer (§2 (a))
// ---------------------------------------------------------------------------

/**
 * List all currently-cached USDOT numbers from KV (keys under `fmcsa:usdot:`),
 * paginating the KV list cursor. These are the carriers the weekly cron re-ingests.
 * @param {object} env
 * @returns {Promise<string[]>}
 */
export async function listCachedUsdots(env) {
  const kv = env && env.MP_KV;
  if (!kv || typeof kv.list !== 'function') return [];
  const usdots = [];
  let cursor;
  do {
    const page = await kv.list({ prefix: FMCSA_USDOT_KV_PREFIX, cursor });
    for (const k of page.keys || []) {
      usdots.push(k.name.slice(FMCSA_USDOT_KV_PREFIX.length));
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return usdots;
}

/**
 * Weekly cron: enqueue a SAFER re-ingest batch onto MP_FMCSA_INGEST (producer). Writes a
 * `queued` ingest_log row, then sends one fmcsa_refresh message per cached carrier. The
 * consumer (above, in this same Worker) later processes them and completes the run row.
 * @param {object} env
 * @returns {Promise<{ingest_run_id:string,enqueued:number}>}
 */
export async function enqueueReingestBatch(env) {
  const ingestRunId = id();
  const usdots = await listCachedUsdots(env);

  // Record the run as queued so the admin ingest-health surface shows it immediately.
  await run(
    env,
    `INSERT INTO ingest_log (id, source, run_at, records_processed, errors, status, detail)
     VALUES (?, 'fmcsa_safer', ?, 0, 0, 'queued', ?)`,
    ingestRunId,
    now(),
    `Weekly SAFER re-ingest: ${usdots.length} carrier(s) enqueued.`
  );

  const queue = env && env.MP_FMCSA_INGEST;
  for (const usdot of usdots) {
    await queue.send({ type: 'fmcsa_refresh', usdot, ingest_run_id: ingestRunId });
  }
  return { ingest_run_id: ingestRunId, enqueued: usdots.length };
}

// ---------------------------------------------------------------------------
// Scheduled — 15-minute SMS alert dispatch (§2 (b), §4.4)
// ---------------------------------------------------------------------------

/**
 * Compose the SMS body for a due alert row.
 * @param {{task_title:string}} alert
 * @returns {string}
 */
export function buildAlertMessage(alert) {
  return `MovePilot reminder: ${alert.task_title}`;
}

/**
 * Dispatch one SMS. When SMS_PROVIDER_KEY is unset this is a persisted no-op that still
 * counts as "sent" (§2, §4.4) — the alert row is not lost, it is just not physically sent.
 * When the key is set it POSTs to the provider and meters the `sms` usage row.
 * @param {object} env
 * @param {string} phone
 * @param {string} message
 * @returns {Promise<{sent:true,noop:boolean}>}
 * @throws on provider transport / non-2xx (caller marks the alert 'failed')
 */
export async function sendSms(env, phone, message) {
  if (!env || !env.SMS_PROVIDER_KEY) {
    // No provider configured: no-op success (alert persists, marked 'sent').
    return { sent: true, noop: true };
  }
  const res = await fetch('https://sms.example-provider.com/v1/messages', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.SMS_PROVIDER_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ to: phone, body: message }),
  });
  await incrementApiUsage(env, 'sms', 1); // meter one SMS (1¢ placeholder cost)
  if (!res.ok) throw new Error(`SMS provider returned HTTP ${res.status}`);
  return { sent: true, noop: false };
}

/**
 * 15-minute cron: select alerts due for dispatch (send_at <= now AND status='scheduled'),
 * send each, and mark it 'sent' or 'failed'. Only 'scheduled' rows at/behind `nowIso` are
 * touched — future, already-sent, and cancelled rows are left untouched.
 * @param {object} env
 * @param {string} [nowIso=now()] injectable "now" for deterministic tests
 * @returns {Promise<{dispatched:number,sent:number,failed:number}>}
 */
export async function dispatchDueAlerts(env, nowIso = now()) {
  const due = await all(
    env,
    `SELECT id, task_title, phone, send_at, status
       FROM alerts
      WHERE send_at <= ? AND status = 'scheduled'`,
    nowIso
  );

  let sent = 0;
  let failed = 0;
  for (const alert of due) {
    let status;
    try {
      await sendSms(env, alert.phone, buildAlertMessage(alert));
      status = 'sent';
      sent += 1;
    } catch (e) {
      status = 'failed';
      failed += 1;
    }
    await run(env, `UPDATE alerts SET status = ? WHERE id = ?`, status, alert.id);
  }
  return { dispatched: due.length, sent, failed };
}

/**
 * Route a scheduled event to the correct cron handler by inspecting event.cron.
 * @param {{cron?:string,scheduledTime?:number}} event
 * @param {object} env
 */
export async function handleScheduled(event, env) {
  const cron = event && event.cron;
  if (cron === WEEKLY_CRON) {
    return enqueueReingestBatch(env);
  }
  if (cron === ALERTS_CRON) {
    return dispatchDueAlerts(env);
  }
  // Unknown cron: no-op (never throw out of a scheduled handler).
  return { skipped: true, cron };
}

// ---------------------------------------------------------------------------
// Worker module entrypoint
// ---------------------------------------------------------------------------

export default {
  /**
   * Queue consumer entrypoint (MP_FMCSA_INGEST).
   * @param {{messages:Array}} batch
   * @param {object} env
   */
  async queue(batch, env) {
    await consumeQueueBatch(batch, env);
  },

  /**
   * Cron entrypoint. event.cron distinguishes the weekly vs 15-minute trigger.
   * @param {{cron?:string,scheduledTime?:number}} event
   * @param {object} env
   * @param {{waitUntil?:Function}} [ctx]
   */
  async scheduled(event, env, ctx) {
    await handleScheduled(event, env);
  },
};
