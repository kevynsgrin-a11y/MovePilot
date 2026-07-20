import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Activity,
  KeyRound,
  AlertTriangle,
  RefreshCw,
  Gauge,
  EyeOff,
  Eye,
  Send,
  Lock,
} from 'lucide-react';
import {
  api,
  ApiError,
  getAuthToken,
  setAuthToken,
  type AdminIngestHealth,
  type AdminApiUsage,
  type AdminNoindexAudit,
} from '@/lib/api';
import { Button, Card, Input, Badge, Eyebrow, Skeleton, type BadgeTone } from '@/components/ui';

/**
 * /admin (§3.11) — internal, admin-authed console. Utility-grade + dense, ivory,
 * tabular everything. Status tiles + run/usage/route tables from the three admin
 * GETs, plus the real ingest trigger (POST /api/admin/ingest/trigger). A 401/403
 * renders a bearer-entry gate. Noindex override toggles stage locally — v1 exposes
 * no override write endpoint, so a notice makes that explicit (no invented endpoint).
 */

type Phase = 'gate' | 'loading' | 'ready';

function isAuthLike(e: unknown): boolean {
  return (
    e instanceof ApiError &&
    (e.status === 401 || e.status === 403 || e.code === 'UNAUTHENTICATED' || e.code === 'FORBIDDEN')
  );
}
function errMsg(e: unknown): string {
  return e instanceof ApiError ? e.message : 'Request failed — please try again.';
}

// --- generic record helpers (ingest runs have an unspecified shape) ---
function pick(rec: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    if (rec[k] !== undefined && rec[k] !== null) return String(rec[k]);
  }
  return null;
}
function statusTone(s: string | null): BadgeTone {
  if (!s) return 'neutral';
  const v = s.toLowerCase();
  if (/(fail|error|red|dead)/.test(v)) return 'danger';
  if (/(warn|partial|amber|stale|degraded|pending|running)/.test(v)) return 'warn';
  if (/(ok|success|done|complete|green|healthy|finished)/.test(v)) return 'success';
  return 'neutral';
}
function cellText(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function StatusTile({
  label,
  value,
  tone = 'neutral',
  sub,
}: {
  label: string;
  value: string;
  tone?: BadgeTone;
  sub?: string;
}) {
  const dot: Record<BadgeTone, string> = {
    neutral: 'bg-text-faint',
    accent: 'bg-accent',
    success: 'bg-[color:var(--success)]',
    warn: 'bg-[color:var(--warn)]',
    danger: 'bg-[color:var(--danger)]',
    copper: 'bg-copper',
  };
  return (
    <div className="flex flex-col gap-1 rounded-md border border-[color:var(--border)] bg-surface px-4 py-3">
      <span className="text-caption font-semibold uppercase tracking-[0.06em] text-text-faint">
        {label}
      </span>
      <span className="flex items-center gap-2">
        <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${dot[tone]}`} />
        <span className="tabular text-h4 font-semibold text-text">{value}</span>
      </span>
      {sub && <span className="text-caption text-text-faint tabular">{sub}</span>}
    </div>
  );
}

function SectionError({ msg, onRetry }: { msg: string; onRetry: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-[color:var(--danger)]/35 bg-[color:var(--danger)]/10 p-3">
      <p className="flex items-center gap-2 text-body-sm text-[color:var(--danger)]">
        <AlertTriangle size={16} aria-hidden="true" />
        {msg}
      </p>
      <Button size="sm" variant="secondary" onClick={onRetry}>
        <RefreshCw size={14} aria-hidden="true" />
        Retry
      </Button>
    </div>
  );
}

export function Admin() {
  const [phase, setPhase] = useState<Phase>(() => (getAuthToken() ? 'loading' : 'gate'));
  const [keyInput, setKeyInput] = useState('');
  const [gateError, setGateError] = useState<string | null>(null);

  const [reload, setReload] = useState(0);

  const [health, setHealth] = useState<AdminIngestHealth | null>(null);
  const [healthErr, setHealthErr] = useState<string | null>(null);
  const [usage, setUsage] = useState<AdminApiUsage | null>(null);
  const [usageErr, setUsageErr] = useState<string | null>(null);
  const [audit, setAudit] = useState<AdminNoindexAudit | null>(null);
  const [auditErr, setAuditErr] = useState<string | null>(null);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const loadAll = useCallback(async () => {
    setPhase('loading');
    const [h, u, a] = await Promise.allSettled([
      api.admin.ingestHealth(50),
      api.admin.apiUsage(from || undefined, to || undefined),
      api.admin.noindexAudit(),
    ]);

    // Any auth-like rejection → back to the bearer gate.
    const authFail = [h, u, a].find((r) => r.status === 'rejected' && isAuthLike(r.reason));
    if (authFail && authFail.status === 'rejected') {
      setGateError(errMsg(authFail.reason));
      setPhase('gate');
      return;
    }

    h.status === 'fulfilled' ? (setHealth(h.value), setHealthErr(null)) : setHealthErr(errMsg(h.reason));
    u.status === 'fulfilled' ? (setUsage(u.value), setUsageErr(null)) : setUsageErr(errMsg(u.reason));
    a.status === 'fulfilled' ? (setAudit(a.value), setAuditErr(null)) : setAuditErr(errMsg(a.reason));
    setPhase('ready');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  useEffect(() => {
    if (getAuthToken()) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reload]);

  const submitKey = (e: FormEvent) => {
    e.preventDefault();
    const k = keyInput.trim();
    if (!k) {
      setGateError('Enter the admin bearer token.');
      return;
    }
    setAuthToken(k);
    setGateError(null);
    setReload((n) => n + 1);
  };

  // --- Ingest health derived tiles ---
  const runs = health?.runs ?? [];
  const runCols = useMemo(() => {
    const set = new Set<string>();
    for (const r of runs) for (const k of Object.keys(r)) set.add(k);
    return Array.from(set);
  }, [runs]);
  const latestStatus = runs.length ? pick(runs[0], ['status', 'state', 'result', 'outcome']) : null;
  const failedRuns = runs.filter(
    (r) => statusTone(pick(r, ['status', 'state', 'result', 'outcome'])) === 'danger',
  ).length;

  // --- API usage per-provider roll-up (display aggregation of fetched rows) ---
  const perProvider = useMemo(() => {
    const map = new Map<string, { calls: number; cents: number }>();
    for (const row of usage?.usage ?? []) {
      const cur = map.get(row.provider) ?? { calls: 0, cents: 0 };
      cur.calls += row.calls;
      cur.cents += row.cost_cents;
      map.set(row.provider, cur);
    }
    return Array.from(map.entries()).map(([provider, v]) => ({ provider, ...v }));
  }, [usage]);
  const maxCalls = Math.max(1, ...perProvider.map((p) => p.calls));

  // --- Noindex overrides (staged locally; no persistence endpoint in v1) ---
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const toggleOverride = (id: string, current: boolean) =>
    setOverrides((prev) => ({ ...prev, [id]: !(prev[id] ?? current) }));

  // --- Ingest trigger ---
  const [usdots, setUsdots] = useState('');
  const [triggering, setTriggering] = useState(false);
  const [triggerMsg, setTriggerMsg] = useState<string | null>(null);
  const [triggerErr, setTriggerErr] = useState<string | null>(null);
  const trigger = async (e: FormEvent) => {
    e.preventDefault();
    const list = usdots
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (list.length === 0) {
      setTriggerErr('Enter at least one USDOT number.');
      return;
    }
    setTriggering(true);
    setTriggerErr(null);
    setTriggerMsg(null);
    try {
      const r = await api.admin.triggerIngest(list);
      setTriggerMsg(`Enqueued ${r.enqueued} — run ${r.ingest_run_id}`);
      setUsdots('');
    } catch (err) {
      if (isAuthLike(err)) {
        setGateError(errMsg(err));
        setPhase('gate');
      } else setTriggerErr(errMsg(err));
    } finally {
      setTriggering(false);
    }
  };

  // ---------------- Bearer gate ----------------
  if (phase === 'gate') {
    return (
      <div className="container-mp py-16 md:py-24">
        <Card padding="lg" className="mx-auto flex max-w-md flex-col gap-4">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-surface-sunk text-text-muted">
            <Lock size={20} aria-hidden="true" />
          </span>
          <div>
            <h1 className="font-display text-h3 font-medium text-text">Admin access</h1>
            <p className="mt-1 text-body-sm text-text-muted">
              This console requires an admin bearer token.
            </p>
          </div>
          <form className="flex flex-col gap-3" onSubmit={submitKey}>
            <Input
              label="Admin bearer token"
              type="password"
              placeholder="ADMIN_API_KEY"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              prefix={<KeyRound size={16} aria-hidden="true" />}
              className="data-raw"
              error={gateError ?? undefined}
              autoComplete="off"
            />
            <Button type="submit" block>
              Unlock console
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  const loading = phase === 'loading';

  return (
    <div className="container-mp py-10 md:py-14">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Eyebrow>Internal</Eyebrow>
          <h1 className="flex items-center gap-2.5 font-display text-h3 font-medium text-text">
            <Activity size={24} aria-hidden="true" className="text-accent-ink dark:text-accent" />
            Operations console
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setReload((n) => n + 1)} disabled={loading}>
            <RefreshCw size={14} aria-hidden="true" />
            Refresh
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="!border-[color:var(--border-strong)] !text-text-muted"
            onClick={() => {
              setAuthToken(null);
              setPhase('gate');
            }}
          >
            Sign out
          </Button>
        </div>
      </header>

      {/* ---------------- Ingestion health ---------------- */}
      <section aria-labelledby="ingest-h" className="mt-10 flex flex-col gap-4">
        <h2 id="ingest-h" className="text-h5 font-semibold text-text">
          Ingestion health
        </h2>
        {loading ? (
          <Skeleton className="h-24 w-full" />
        ) : healthErr ? (
          <SectionError msg={healthErr} onRetry={() => setReload((n) => n + 1)} />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatusTile
                label="Latest run"
                value={latestStatus ?? '—'}
                tone={statusTone(latestStatus)}
              />
              <StatusTile label="Runs returned" value={String(runs.length)} tone="accent" />
              <StatusTile
                label="Failed runs"
                value={String(failedRuns)}
                tone={failedRuns > 0 ? 'danger' : 'success'}
              />
              <StatusTile
                label="Last seen"
                value={runs.length ? pick(runs[0], ['finished_at', 'created_at', 'ran_at', 'started_at', 'day']) ?? '—' : '—'}
              />
            </div>

            {runs.length > 0 ? (
              <div className="overflow-x-auto rounded-md border border-[color:var(--border)]">
                <table className="w-full min-w-[36rem] border-collapse text-body-sm">
                  <caption className="sr-only">Recent ingestion runs</caption>
                  <thead>
                    <tr className="border-b border-[color:var(--border-strong)] bg-surface-sunk text-left text-caption uppercase tracking-[0.06em] text-text-faint">
                      {runCols.map((c) => (
                        <th key={c} scope="col" className="whitespace-nowrap px-3 py-2 font-semibold">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="tabular">
                    {runs.map((r, i) => (
                      <tr key={i} className="border-b border-[color:var(--border)]">
                        {runCols.map((c) => (
                          <td key={c} className="whitespace-nowrap px-3 py-2 text-text-muted">
                            {cellText(r[c])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-body-sm text-text-faint">No ingestion runs recorded.</p>
            )}
          </>
        )}
      </section>

      {/* ---------------- API cost / rate monitor ---------------- */}
      <section aria-labelledby="usage-h" className="mt-12 flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="usage-h" className="flex items-center gap-2 text-h5 font-semibold text-text">
            <Gauge size={18} aria-hidden="true" className="text-text-faint" />
            API cost &amp; rate monitor
          </h2>
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setReload((n) => n + 1);
            }}
          >
            <Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} containerClassName="w-40" />
            <Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} containerClassName="w-40" />
            <Button type="submit" variant="secondary" size="sm">
              Apply
            </Button>
          </form>
        </div>

        {loading ? (
          <Skeleton className="h-24 w-full" />
        ) : usageErr ? (
          <SectionError msg={usageErr} onRetry={() => setReload((n) => n + 1)} />
        ) : perProvider.length > 0 ? (
          <>
            <div className="flex flex-col gap-2">
              {perProvider.map((p) => (
                <div key={p.provider} className="flex items-center gap-3">
                  <span className="w-32 shrink-0 truncate text-body-sm font-medium text-text">
                    {p.provider}
                  </span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-pill bg-surface-sunk">
                    <div
                      className="h-full rounded-pill bg-accent"
                      style={{ width: `${(p.calls / maxCalls) * 100}%` }}
                    />
                  </div>
                  <span className="w-24 shrink-0 text-right tabular text-body-sm text-text-muted">
                    {p.calls.toLocaleString('en-US')} calls
                  </span>
                  <span className="w-24 shrink-0 text-right tabular text-body-sm font-medium text-text">
                    ${(p.cents / 100).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="overflow-x-auto rounded-md border border-[color:var(--border)]">
              <table className="w-full min-w-[30rem] border-collapse text-body-sm">
                <caption className="sr-only">API usage by provider and day</caption>
                <thead>
                  <tr className="border-b border-[color:var(--border-strong)] bg-surface-sunk text-left text-caption uppercase tracking-[0.06em] text-text-faint">
                    <th scope="col" className="px-3 py-2 font-semibold">Provider</th>
                    <th scope="col" className="px-3 py-2 font-semibold">Day</th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold">Calls</th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold">Cost</th>
                  </tr>
                </thead>
                <tbody className="tabular">
                  {usage!.usage.map((row, i) => (
                    <tr key={i} className="border-b border-[color:var(--border)]">
                      <td className="px-3 py-2 text-text">{row.provider}</td>
                      <td className="px-3 py-2 text-text-muted">{row.day}</td>
                      <td className="px-3 py-2 text-right text-text-muted">
                        {row.calls.toLocaleString('en-US')}
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-text">
                        ${(row.cost_cents / 100).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="text-body-sm text-text-faint">No API usage in this window.</p>
        )}
      </section>

      {/* ---------------- Noindex suppression audit ---------------- */}
      <section aria-labelledby="noindex-h" className="mt-12 flex flex-col gap-4">
        <h2 id="noindex-h" className="flex items-center gap-2 text-h5 font-semibold text-text">
          <EyeOff size={18} aria-hidden="true" className="text-text-faint" />
          Noindex suppression audit
        </h2>
        {loading ? (
          <Skeleton className="h-24 w-full" />
        ) : auditErr ? (
          <SectionError msg={auditErr} onRetry={() => setReload((n) => n + 1)} />
        ) : audit && audit.routes.length > 0 ? (
          <>
            <p className="flex items-start gap-1.5 rounded-md border border-[color:var(--warn)]/35 bg-[color:var(--warn)]/10 p-3 text-caption text-text-muted">
              <AlertTriangle size={14} aria-hidden="true" className="mt-0.5 shrink-0 text-[color:var(--warn)]" />
              Override toggles stage a change locally. v1 exposes no override write endpoint, so
              staged changes are applied during the next data ingest — nothing is persisted from
              this screen.
            </p>
            <div className="overflow-x-auto rounded-md border border-[color:var(--border)]">
              <table className="w-full min-w-[40rem] border-collapse text-body-sm">
                <caption className="sr-only">Route noindex flags with reasons and override toggles</caption>
                <thead>
                  <tr className="border-b border-[color:var(--border-strong)] bg-surface-sunk text-left text-caption uppercase tracking-[0.06em] text-text-faint">
                    <th scope="col" className="px-3 py-2 font-semibold">Route</th>
                    <th scope="col" className="px-3 py-2 font-semibold">Status</th>
                    <th scope="col" className="px-3 py-2 font-semibold">Reason</th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold">Carriers (o/d)</th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold">Override</th>
                  </tr>
                </thead>
                <tbody className="tabular">
                  {audit.routes.map((r) => {
                    const staged = overrides[r.id];
                    const effective = staged === undefined ? r.noindex : staged;
                    const changed = staged !== undefined && staged !== r.noindex;
                    return (
                      <tr key={r.id} className="border-b border-[color:var(--border)]">
                        <td className="px-3 py-2 data-raw text-text">{r.id}</td>
                        <td className="px-3 py-2">
                          {effective ? (
                            <Badge tone="warn" icon={<EyeOff />}>
                              Noindex{changed ? ' (staged)' : ''}
                            </Badge>
                          ) : (
                            <Badge tone="success" icon={<Eye />}>
                              Indexed{changed ? ' (staged)' : ''}
                            </Badge>
                          )}
                        </td>
                        <td className="px-3 py-2 text-text-muted">{r.noindex_reason ?? '—'}</td>
                        <td className="px-3 py-2 text-right text-text-muted">
                          {r.origin_carrier_count} / {r.dest_carrier_count}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={effective}
                            aria-label={`Toggle noindex for ${r.id}`}
                            onClick={() => toggleOverride(r.id, r.noindex)}
                            className={
                              'relative inline-flex h-6 w-11 items-center rounded-pill border transition-colors ' +
                              (effective
                                ? 'border-[color:var(--warn)]/50 bg-[color:var(--warn)]/30'
                                : 'border-[color:var(--border-strong)] bg-surface-sunk')
                            }
                          >
                            <span
                              aria-hidden="true"
                              className={
                                'inline-block h-4 w-4 rounded-full bg-text transition-transform ' +
                                (effective ? 'translate-x-6' : 'translate-x-1')
                              }
                            />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="text-body-sm text-text-faint">No routes to audit.</p>
        )}
      </section>

      {/* ---------------- Trigger ingest ---------------- */}
      <section aria-labelledby="trigger-h" className="mt-12 flex flex-col gap-4">
        <h2 id="trigger-h" className="flex items-center gap-2 text-h5 font-semibold text-text">
          <Send size={18} aria-hidden="true" className="text-text-faint" />
          Trigger FMCSA ingest
        </h2>
        <Card padding="md" className="max-w-2xl">
          <form className="flex flex-col gap-3" onSubmit={trigger}>
            <label className="flex flex-col gap-1.5">
              <span className="text-body-sm font-medium text-text">USDOT numbers</span>
              <textarea
                value={usdots}
                onChange={(e) => setUsdots(e.target.value)}
                rows={3}
                placeholder="Comma- or space-separated, e.g. 1523421, 2894110"
                className="w-full rounded-sm border-[1.5px] border-[color:var(--border-strong)] bg-surface px-3 py-2.5 data-raw text-body-sm text-text outline-none placeholder:text-text-faint focus:border-[color:var(--accent)]"
              />
            </label>
            <div className="flex items-center gap-3">
              <Button type="submit" loading={triggering}>
                <Send size={16} aria-hidden="true" />
                Enqueue ingest
              </Button>
              {triggerMsg && (
                <Badge tone="success" icon={<Activity />}>
                  {triggerMsg}
                </Badge>
              )}
            </div>
            {triggerErr && (
              <p className="flex items-center gap-1.5 text-body-sm text-[color:var(--danger)]">
                <AlertTriangle size={15} aria-hidden="true" />
                {triggerErr}
              </p>
            )}
          </form>
        </Card>
      </section>
    </div>
  );
}
