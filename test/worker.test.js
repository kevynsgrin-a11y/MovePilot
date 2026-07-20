// test/worker.test.js — MovePilot COMPANION WORKER unit tests (SPEC §2, §4.4, §8, §9.5).
//
// The Worker's queue() consumer and scheduled() cron cannot be driven by
// `wrangler pages dev`, so their pure logic is exercised directly here with mocked
// D1 / KV / SMS (and a mocked global fetch for the FMCSA_WEBKEY path). No live internet
// is touched (§9.4). Two behaviours are asserted:
//   (a) a fmcsa_refresh message writes the parsed record to KV and updates ingest_log;
//   (b) the 15-minute cron scan selects EXACTLY the due 'scheduled' alerts and marks them.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import worker, {
  consumeQueueBatch,
  handleFmcsaRefresh,
  refreshFmcsaRecord,
  upsertIngestLog,
  listCachedUsdots,
  enqueueReingestBatch,
  dispatchDueAlerts,
  sendSms,
  handleScheduled,
  buildAlertMessage,
  WEEKLY_CRON,
  ALERTS_CRON,
} from '../worker/index.js';

// --- In-memory KV mock (get/put/delete/list with prefix + cursor pagination) ----------
function mockKV(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    store,
    async get(k) {
      return store.has(k) ? store.get(k) : null;
    },
    async put(k, v) {
      store.set(k, v);
    },
    async delete(k) {
      store.delete(k);
    },
    async list({ prefix = '', cursor } = {}) {
      const keys = [...store.keys()]
        .filter((k) => k.startsWith(prefix))
        .map((name) => ({ name }));
      return { keys, list_complete: true, cursor: undefined };
    },
  };
}

// --- In-memory D1 mock. Interprets exactly the SQL the Worker + usage.js issue. --------
function mockD1(tables = {}) {
  const t = { alerts: [], ingest_log: [], api_usage: [], ...tables };
  const calls = [];
  function stmt(sql) {
    let params = [];
    return {
      bind(...p) {
        params = p;
        return this;
      },
      async run() {
        calls.push({ sql, params });
        if (/INSERT INTO ingest_log/i.test(sql)) {
          if (/ON CONFLICT/i.test(sql)) {
            // Consumer upsert: source is a SQL literal → params are
            // [id, run_at, records_processed, errors, status, detail].
            const [rid, run_at, processed, errors, status, detail] = params;
            const existing = t.ingest_log.find((r) => r.id === rid);
            if (existing) {
              existing.run_at = run_at;
              existing.records_processed += processed;
              existing.errors += errors;
              existing.status =
                existing.errors === 0
                  ? 'success'
                  : existing.records_processed > existing.errors
                    ? 'partial'
                    : 'failed';
              existing.detail = detail;
            } else {
              t.ingest_log.push({
                id: rid,
                source: 'fmcsa_safer',
                run_at,
                records_processed: processed,
                errors,
                status,
                detail,
              });
            }
          } else {
            // Weekly enqueue plain insert: source/counts/status are literals →
            // params are [id, run_at, detail].
            const [rid, run_at, detail] = params;
            t.ingest_log.push({
              id: rid,
              source: 'fmcsa_safer',
              run_at,
              records_processed: 0,
              errors: 0,
              status: 'queued',
              detail,
            });
          }
          return { meta: {} };
        }
        if (/UPDATE alerts SET status/i.test(sql)) {
          const [status, aid] = params;
          const a = t.alerts.find((r) => r.id === aid);
          if (a) a.status = status;
          return { meta: {} };
        }
        if (/INSERT INTO api_usage/i.test(sql)) {
          const [aid, provider, day, callsN, cost] = params;
          const existing = t.api_usage.find((r) => r.provider === provider && r.day === day);
          if (existing) {
            existing.calls += callsN;
            existing.cost_cents += cost;
          } else {
            t.api_usage.push({ id: aid, provider, day, calls: callsN, cost_cents: cost });
          }
          return { meta: {} };
        }
        return { meta: {} };
      },
      async all() {
        calls.push({ sql, params });
        if (/FROM alerts/i.test(sql)) {
          const [nowIso] = params;
          const results = t.alerts.filter(
            (r) => r.send_at <= nowIso && r.status === 'scheduled'
          );
          return { results };
        }
        return { results: [] };
      },
      async first() {
        calls.push({ sql, params });
        return null;
      },
    };
  }
  return {
    _tables: t,
    _calls: calls,
    prepare(sql) {
      return stmt(sql);
    },
    batch(statements) {
      return Promise.all(statements.map((s) => s.run()));
    },
  };
}

// A SAFER QCMobile-shaped upstream JSON body for the mocked fetch (FMCSA_WEBKEY path).
function saferResponse() {
  return {
    content: {
      carrier: {
        legalName: 'ACME MOVERS INC',
        dotNumber: 1234567,
        allowedToOperate: 'Y',
        carrierOperation: { carrierOperationDesc: 'Interstate; HHG' },
        bipdInsuranceOnFile: '1000000',
        crashTotal: 2,
        driverInsp: 15,
      },
    },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

// =====================================================================================
// (a) Queue consumer: fmcsa_refresh → KV + ingest_log
// =====================================================================================
describe('queue consumer — fmcsa_refresh (§4.4, §9.5)', () => {
  it('refreshes SAFER into KV and marks the ingest run success', async () => {
    const MP_KV = mockKV();
    const MP_DB = mockD1();
    const env = { MP_KV, MP_DB, FMCSA_WEBKEY: 'test-key' };

    // Mock upstream SAFER fetch (no live internet, §9.4).
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify(saferResponse()), { status: 200 }));

    const ack = vi.fn();
    const retry = vi.fn();
    const batch = {
      messages: [
        {
          body: { type: 'fmcsa_refresh', usdot: '1234567', ingest_run_id: 'run-1' },
          ack,
          retry,
        },
      ],
    };

    await worker.queue(batch, env);

    // KV now holds the parsed record under fmcsa:usdot:1234567.
    const cached = JSON.parse(MP_KV.store.get('fmcsa:usdot:1234567'));
    expect(cached.parsed.authorized_for_hhg).toBe(true);
    expect(cached.parsed.meets_750k_minimum).toBe(true);
    expect(cached.source).toBe('FMCSA SAFER');

    // ingest_log run row updated: 1 processed, 0 errors, success.
    const runRow = MP_DB._tables.ingest_log.find((r) => r.id === 'run-1');
    expect(runRow).toBeDefined();
    expect(runRow.records_processed).toBe(1);
    expect(runRow.errors).toBe(0);
    expect(runRow.status).toBe('success');
    expect(runRow.source).toBe('fmcsa_safer');

    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(ack).toHaveBeenCalledOnce();
    expect(retry).not.toHaveBeenCalled();
  });

  it('forces a re-fetch by deleting the stale KV key first when a webkey is set', async () => {
    const MP_KV = mockKV({
      'fmcsa:usdot:1234567': JSON.stringify({
        raw: {},
        parsed: { authorized_for_hhg: false, meets_750k_minimum: false },
        source: 'FMCSA SAFER',
        fetched_at: '2000-01-01T00:00:00.000Z', // stale
      }),
    });
    const env = { MP_KV, MP_DB: mockD1(), FMCSA_WEBKEY: 'test-key' };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(saferResponse()), { status: 200 })
    );

    const record = await refreshFmcsaRecord(env, '1234567');
    // Re-fetched, not the stale cache.
    expect(record.authorized_for_hhg).toBe(true);
    const cached = JSON.parse(MP_KV.store.get('fmcsa:usdot:1234567'));
    expect(cached.fetched_at).not.toBe('2000-01-01T00:00:00.000Z');
  });

  it('cache-only miss (no webkey, uncached) counts as an error → run marked failed', async () => {
    const MP_DB = mockD1();
    const env = { MP_KV: mockKV(), MP_DB }; // no FMCSA_WEBKEY
    const ack = vi.fn();

    await consumeQueueBatch(
      {
        messages: [
          {
            body: { type: 'fmcsa_refresh', usdot: '9999999', ingest_run_id: 'run-miss' },
            ack,
          },
        ],
      },
      env
    );

    const runRow = MP_DB._tables.ingest_log.find((r) => r.id === 'run-miss');
    expect(runRow.records_processed).toBe(1);
    expect(runRow.errors).toBe(1);
    expect(runRow.status).toBe('failed');
    expect(ack).toHaveBeenCalledOnce(); // terminal skip, not retried
  });

  it('handleFmcsaRefresh rejects unknown message types and missing usdot', async () => {
    const env = { MP_KV: mockKV(), MP_DB: mockD1() };
    expect(await handleFmcsaRefresh({ type: 'nope' }, env)).toMatchObject({ ok: false });
    expect(await handleFmcsaRefresh({ type: 'fmcsa_refresh' }, env)).toMatchObject({
      ok: false,
      reason: 'missing_usdot',
    });
  });

  it('accumulates records across multiple messages of the same run', async () => {
    const MP_KV = mockKV();
    const MP_DB = mockD1();
    const env = { MP_KV, MP_DB, FMCSA_WEBKEY: 'k' };
    // Fresh Response per call — a Response body can only be read once.
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      async () => new Response(JSON.stringify(saferResponse()), { status: 200 })
    );
    await consumeQueueBatch(
      {
        messages: [
          { body: { type: 'fmcsa_refresh', usdot: '111', ingest_run_id: 'r' }, ack: vi.fn() },
          { body: { type: 'fmcsa_refresh', usdot: '222', ingest_run_id: 'r' }, ack: vi.fn() },
        ],
      },
      env
    );
    const runRow = MP_DB._tables.ingest_log.find((r) => r.id === 'r');
    expect(runRow.records_processed).toBe(2);
    expect(runRow.errors).toBe(0);
    expect(runRow.status).toBe('success');
  });

  it('retries the message when refresh throws (transient upstream failure)', async () => {
    const MP_DB = mockD1();
    const env = { MP_KV: mockKV(), MP_DB, FMCSA_WEBKEY: 'k' };
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'));
    const ack = vi.fn();
    const retry = vi.fn();
    await consumeQueueBatch(
      {
        messages: [
          { body: { type: 'fmcsa_refresh', usdot: '1234567', ingest_run_id: 'run-x' }, ack, retry },
        ],
      },
      env
    );
    expect(retry).toHaveBeenCalledOnce();
    expect(ack).not.toHaveBeenCalled();
    const runRow = MP_DB._tables.ingest_log.find((r) => r.id === 'run-x');
    expect(runRow.errors).toBe(1);
    expect(runRow.status).toBe('failed');
  });

  it('upsertIngestLog accumulates across batches and recomputes status', async () => {
    const MP_DB = mockD1();
    const env = { MP_DB };
    await upsertIngestLog(env, 'multi', 3, 0); // success
    await upsertIngestLog(env, 'multi', 2, 1); // now 5 processed, 1 error → partial
    const row = MP_DB._tables.ingest_log.find((r) => r.id === 'multi');
    expect(row.records_processed).toBe(5);
    expect(row.errors).toBe(1);
    expect(row.status).toBe('partial');
  });
});

// =====================================================================================
// (b) 15-minute cron: due-alert scan + dispatch
// =====================================================================================
describe('scheduled cron — SMS alert dispatch (§2, §4.4)', () => {
  const NOW = '2026-07-19T12:00:00.000Z';

  function alertRows() {
    return [
      { id: 'a-due', task_title: 'Confirm carrier', phone: '+15550001', send_at: '2026-07-19T11:00:00.000Z', status: 'scheduled' },
      { id: 'a-exactly-now', task_title: 'Pack', phone: '+15550002', send_at: NOW, status: 'scheduled' },
      { id: 'a-future', task_title: 'Move week', phone: '+15550003', send_at: '2026-07-20T12:00:00.000Z', status: 'scheduled' },
      { id: 'a-sent', task_title: 'Old', phone: '+15550004', send_at: '2026-07-18T12:00:00.000Z', status: 'sent' },
      { id: 'a-cancelled', task_title: 'Void', phone: '+15550005', send_at: '2026-07-18T12:00:00.000Z', status: 'cancelled' },
    ];
  }

  it('dispatches exactly the due scheduled alerts and marks them sent (SMS no-op)', async () => {
    const MP_DB = mockD1({ alerts: alertRows() });
    const env = { MP_DB }; // no SMS_PROVIDER_KEY → no-op sends, still 'sent'

    const result = await dispatchDueAlerts(env, NOW);

    expect(result).toEqual({ dispatched: 2, sent: 2, failed: 0 });
    const byId = Object.fromEntries(MP_DB._tables.alerts.map((a) => [a.id, a.status]));
    expect(byId['a-due']).toBe('sent');
    expect(byId['a-exactly-now']).toBe('sent'); // send_at == now is due (<=)
    expect(byId['a-future']).toBe('scheduled'); // untouched
    expect(byId['a-sent']).toBe('sent'); // untouched (already sent)
    expect(byId['a-cancelled']).toBe('cancelled'); // untouched
  });

  it('marks an alert failed when the SMS provider errors', async () => {
    const MP_DB = mockD1({
      alerts: [
        { id: 'a1', task_title: 'x', phone: '+1', send_at: '2026-07-19T00:00:00.000Z', status: 'scheduled' },
      ],
    });
    const env = { MP_DB, SMS_PROVIDER_KEY: 'sk' };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('nope', { status: 500 }));

    const result = await dispatchDueAlerts(env, NOW);
    expect(result).toEqual({ dispatched: 1, sent: 0, failed: 1 });
    expect(MP_DB._tables.alerts[0].status).toBe('failed');
  });

  it('sends via provider + meters usage when SMS_PROVIDER_KEY is set', async () => {
    const MP_DB = mockD1({
      alerts: [
        { id: 'a1', task_title: 'x', phone: '+1', send_at: '2026-07-19T00:00:00.000Z', status: 'scheduled' },
      ],
    });
    const env = { MP_DB, SMS_PROVIDER_KEY: 'sk' };
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 200 }));

    const result = await dispatchDueAlerts(env, NOW);
    expect(result).toEqual({ dispatched: 1, sent: 1, failed: 0 });
    expect(fetchSpy).toHaveBeenCalledOnce();
    const smsUsage = MP_DB._tables.api_usage.find((r) => r.provider === 'sms');
    expect(smsUsage.calls).toBe(1);
  });

  it('sendSms is a persisted no-op success when no provider key is set', async () => {
    expect(await sendSms({}, '+1', 'hi')).toEqual({ sent: true, noop: true });
  });

  it('buildAlertMessage composes the reminder text', () => {
    expect(buildAlertMessage({ task_title: 'File USPS change of address' })).toBe(
      'MovePilot reminder: File USPS change of address'
    );
  });
});

// =====================================================================================
// Weekly cron: SAFER re-ingest enqueue (producer)
// =====================================================================================
describe('scheduled cron — weekly SAFER re-ingest (§2)', () => {
  it('lists cached USDOTs from KV', async () => {
    const env = {
      MP_KV: mockKV({
        'fmcsa:usdot:111': '{}',
        'fmcsa:usdot:222': '{}',
        'fmcsa:mc:333': '{}', // not a usdot key → excluded
        'config:box_sizes': '{}',
      }),
    };
    const usdots = await listCachedUsdots(env);
    expect(usdots.sort()).toEqual(['111', '222']);
  });

  it('enqueues one fmcsa_refresh message per cached carrier + writes a queued run row', async () => {
    const MP_DB = mockD1();
    const sent = [];
    const env = {
      MP_KV: mockKV({ 'fmcsa:usdot:111': '{}', 'fmcsa:usdot:222': '{}' }),
      MP_DB,
      MP_FMCSA_INGEST: {
        async send(msg) {
          sent.push(msg);
        },
      },
    };

    const result = await enqueueReingestBatch(env);

    expect(result.enqueued).toBe(2);
    expect(sent).toHaveLength(2);
    for (const msg of sent) {
      expect(msg.type).toBe('fmcsa_refresh');
      expect(msg.ingest_run_id).toBe(result.ingest_run_id);
    }
    expect(sent.map((m) => m.usdot).sort()).toEqual(['111', '222']);

    const runRow = MP_DB._tables.ingest_log.find((r) => r.id === result.ingest_run_id);
    expect(runRow.status).toBe('queued');
  });

  it('handleScheduled routes crons by event.cron', async () => {
    const sent = [];
    const env = {
      MP_KV: mockKV({ 'fmcsa:usdot:111': '{}' }),
      MP_DB: mockD1({ alerts: [] }),
      MP_FMCSA_INGEST: { async send(m) { sent.push(m); } },
    };
    const weekly = await handleScheduled({ cron: WEEKLY_CRON }, env);
    expect(weekly.enqueued).toBe(1);

    const fifteen = await handleScheduled({ cron: ALERTS_CRON }, env);
    expect(fifteen).toMatchObject({ dispatched: 0 });

    const unknown = await handleScheduled({ cron: '0 0 1 1 *' }, env);
    expect(unknown).toMatchObject({ skipped: true });
  });

  it('default scheduled() entrypoint dispatches without throwing', async () => {
    const env = { MP_DB: mockD1({ alerts: [] }) };
    await expect(worker.scheduled({ cron: ALERTS_CRON }, env, {})).resolves.toBeUndefined();
  });
});
