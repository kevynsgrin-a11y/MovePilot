import { useState, type ReactNode } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Check,
  X,
  CloudOff,
} from 'lucide-react';
import { api, ApiError, type FmcsaResult, type FmcsaFound } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { GaugeArc, type GaugeVerdict } from '@/components/ui/GaugeArc';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Button } from '@/components/ui/Button';

/**
 * /tools/carrier-check — FMCSA lookup (§3.3). Left: a single "USDOT or MC number"
 * search with a segmented toggle. Right: the safety report card — a 0–100 gauge dial
 * (stroke = verdict), a verdict chip (icon + label), a <dl> of the federal record, and
 * a monospaced USDOT + "Last queried … UTC" line. All fields come verbatim from
 * GET /api/fmcsa/lookup — nothing is fabricated. Five states: idle, scanning, resolved,
 * not-verifiable (found:false), and upstream-unavailable (502 staleness banner).
 */

type LookupType = 'usdot' | 'mc';
type Phase = 'idle' | 'scanning' | 'resolved' | 'notfound' | 'stale';

// Verdict derived only from real federal fields.
function verdictOf(r: FmcsaFound): { tier: Exclude<GaugeVerdict, 'neutral'>; label: string; value: number } {
  const statusBad = /not\s|out of service|inactive|revoked|none/i.test(r.operating_status);
  if (!r.authorized_for_hhg || statusBad) return { tier: 'danger', label: 'Not authorized', value: 18 };
  if (!r.meets_750k_minimum || !r.insurance_on_file_usd) return { tier: 'warn', label: 'Caution', value: 58 };
  return { tier: 'success', label: 'Authorized', value: 94 };
}

function verdictIcon(tier: GaugeVerdict, size = 20): ReactNode {
  if (tier === 'success') return <CheckCircle2 size={size} aria-hidden="true" />;
  if (tier === 'danger') return <XCircle size={size} aria-hidden="true" />;
  if (tier === 'warn') return <AlertTriangle size={size} aria-hidden="true" />;
  return <ShieldCheck size={size} aria-hidden="true" />;
}

function fmtTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(
    d.getUTCMinutes(),
  )} UTC`;
}

function usd(n: number): string {
  return `$${n.toLocaleString('en-US')}`;
}

function BoolRow({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <dd className="flex items-center justify-end gap-1.5 tabular font-medium text-text">
      {ok ? (
        <Check size={15} aria-hidden="true" className="text-[color:var(--success)]" />
      ) : (
        <X size={15} aria-hidden="true" className="text-[color:var(--danger)]" />
      )}
      {children}
    </dd>
  );
}

export function CarrierCheck() {
  const [type, setType] = useState<LookupType>('usdot');
  const [q, setQ] = useState('');

  const [phase, setPhase] = useState<Phase>('idle');
  const [data, setData] = useState<FmcsaResult | null>(null);
  const [staleInfo, setStaleInfo] = useState<string | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);

  const runLookup = async () => {
    const value = q.trim();
    if (!/^\d+$/.test(value)) {
      setInputError(`Enter a numeric ${type.toUpperCase()} number.`);
      return;
    }
    setInputError(null);
    setPhase('scanning');
    setData(null);
    setStaleInfo(null);
    try {
      const r = await api.fmcsa.lookup(type === 'usdot' ? { usdot: value } : { mc: value });
      setData(r);
      setPhase(r.found ? 'resolved' : 'notfound');
    } catch (e) {
      if (e instanceof ApiError && (e.status === 502 || e.code === 'UPSTREAM')) {
        setStaleInfo(e.message || 'FMCSA source temporarily unavailable.');
        setPhase('stale');
      } else {
        setStaleInfo(e instanceof ApiError ? e.message : 'Lookup failed — please try again.');
        setPhase('stale');
      }
    }
  };

  const found = data && data.found ? (data as FmcsaFound) : null;
  const verdict = found ? verdictOf(found) : null;

  return (
    <div className="container-mp py-12 md:py-20">
      <header className="flex flex-col gap-3">
        <Eyebrow>Verify a carrier</Eyebrow>
        <h1 className="font-display text-h2 font-medium text-text">
          Check any mover against the federal record.
        </h1>
        <p className="max-w-prose text-body-lg text-text-muted">
          Enter a USDOT or MC number. We read the FMCSA SAFER authorization, insurance, and crash
          record — in plain English, straight from the source.
        </p>
      </header>

      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.15fr]">
        {/* ---------------- INPUTS (left) ---------------- */}
        <Card padding="lg" className="rounded-xl lg:sticky lg:top-20 lg:self-start">
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              runLookup();
            }}
          >
            <div className="flex flex-col gap-2">
              <span className="text-body-sm font-medium text-text">Identifier type</span>
              <SegmentedControl
                ariaLabel="Identifier type"
                options={[
                  { value: 'usdot', label: 'USDOT' },
                  { value: 'mc', label: 'MC' },
                ]}
                value={type}
                onChange={(v) => {
                  setType(v as LookupType);
                  setInputError(null);
                }}
                block
              />
            </div>

            <Input
              label={`${type.toUpperCase()} number`}
              inputMode="numeric"
              placeholder={type === 'usdot' ? 'e.g. 1234567' : 'e.g. 987654'}
              value={q}
              onChange={(e) => setQ(e.target.value.replace(/\D/g, ''))}
              prefix={<Search size={16} aria-hidden="true" />}
              error={inputError ?? undefined}
              className="data-raw"
            />

            <Button type="submit" block loading={phase === 'scanning'}>
              <ShieldCheck size={16} aria-hidden="true" />
              Verify authorization &amp; insurance
            </Button>
            <p className="text-caption text-text-faint">
              Powered by federal FMCSA SAFER records · updated weekly. We never store your search.
            </p>
          </form>
        </Card>

        {/* ---------------- READOUT (right) ---------------- */}
        <Card padding="lg" className="rounded-xl">
          {phase === 'idle' ? (
            <div className="flex min-h-[18rem] flex-col items-center justify-center gap-4 text-center">
              <GaugeArc value={null} ariaLabel="Awaiting a carrier lookup">
                <ShieldCheck size={28} aria-hidden="true" className="text-text-faint" />
              </GaugeArc>
              <p className="max-w-xs text-body text-text-muted">
                Enter a USDOT to verify authorization &amp; insurance.
              </p>
            </div>
          ) : phase === 'scanning' ? (
            <div aria-busy="true" className="flex flex-col items-center gap-6">
              <span className="sr-only">Querying the FMCSA record…</span>
              <GaugeArc value={null} scanning ariaLabel="Scanning the FMCSA record">
                <span className="text-caption uppercase tracking-[0.08em] text-text-faint">Scanning…</span>
              </GaugeArc>
              <div className="flex w-full flex-col gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-full" />
                ))}
              </div>
            </div>
          ) : phase === 'stale' ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3 rounded-md border border-[color:var(--warn)]/40 bg-[color:var(--warn)]/12 p-4">
                <CloudOff size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-[color:var(--warn)]" />
                <div className="flex flex-col gap-1">
                  <p className="text-body-sm font-semibold text-[color:var(--warn)]">
                    FMCSA source temporarily unavailable
                  </p>
                  <p className="text-body-sm text-text-muted">{staleInfo}</p>
                </div>
              </div>
              <Button variant="secondary" size="sm" onClick={runLookup} className="self-start">
                Retry lookup
              </Button>
            </div>
          ) : phase === 'notfound' && data && !data.found ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3 rounded-md border border-[color:var(--border-strong)] bg-surface-sunk p-4">
                <AlertTriangle size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-text-muted" />
                <div className="flex flex-col gap-1">
                  <p className="text-body-sm font-semibold text-text">Not verifiable</p>
                  <p className="text-body-sm text-text-muted">{data.reason}</p>
                </div>
              </div>
              <dl className="flex flex-col gap-1 border-t border-[color:var(--border)] pt-3 text-body-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-text-faint">Source</dt>
                  <dd className="data-raw text-text-muted">{data.source}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-text-faint">Fetched</dt>
                  <dd className="data-raw text-text-muted">{fmtTimestamp(data.fetched_at)}</dd>
                </div>
              </dl>
            </div>
          ) : found && verdict ? (
            <div className="flex flex-col gap-6">
              {/* Gauge + verdict */}
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  {verdict.tier === 'success' && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 m-auto h-24 w-24 rounded-full bg-accent/30 animate-ping2"
                    />
                  )}
                  <GaugeArc
                    value={verdict.value}
                    verdict={verdict.tier}
                    ariaLabel={`Authorization status: ${verdict.label}`}
                  >
                    <span className={verdictColorClass(verdict.tier)}>{verdictIcon(verdict.tier, 30)}</span>
                    <span className="mt-1 text-caption font-semibold uppercase tracking-[0.08em] text-text-muted">
                      Status
                    </span>
                  </GaugeArc>
                </div>
                <Badge
                  tone={verdict.tier}
                  variant="soft"
                  icon={verdictIcon(verdict.tier, 14)}
                  className="text-body-sm"
                >
                  {verdict.label}
                </Badge>
                <p className="text-center text-h5 font-semibold text-text">{found.carrier_name}</p>
              </div>

              {/* Plain-English summary (verbatim) */}
              {found.plain_english.length > 0 && (
                <ul className="flex flex-col gap-2">
                  {found.plain_english.map((line, i) => (
                    <li key={i} className="flex items-start gap-2 text-body-sm text-text-muted">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                      {line}
                    </li>
                  ))}
                </ul>
              )}

              {/* Federal record */}
              <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2.5 border-t border-[color:var(--border)] pt-4 text-body-sm">
                <dt className="text-text-muted">Authorized for household goods</dt>
                <BoolRow ok={found.authorized_for_hhg}>{found.authorized_for_hhg ? 'Yes' : 'No'}</BoolRow>

                <dt className="text-text-muted">Operating status</dt>
                <dd className="text-right font-medium text-text">{found.operating_status}</dd>

                <dt className="text-text-muted">Insurance on file</dt>
                <dd className="text-right tabular font-medium text-text">{usd(found.insurance_on_file_usd)}</dd>

                <dt className="text-text-muted">Meets $750k minimum</dt>
                <BoolRow ok={found.meets_750k_minimum}>{found.meets_750k_minimum ? 'Yes' : 'No'}</BoolRow>

                <dt className="text-text-muted">Crashes (total)</dt>
                <dd className="text-right tabular font-medium text-text">
                  {found.crash_total.toLocaleString('en-US')}
                </dd>

                <dt className="text-text-muted">Inspections (total)</dt>
                <dd className="text-right tabular font-medium text-text">
                  {found.inspection_total.toLocaleString('en-US')}
                </dd>
              </dl>

              {/* Raw identifiers + timestamp */}
              <div className="flex flex-col gap-1 border-t border-[color:var(--border)] pt-3 data-raw text-caption text-text-faint">
                <div className="flex items-center justify-between">
                  <span>USDOT {found.usdot}</span>
                  {found.mc && <span>MC {found.mc}</span>}
                </div>
                <div className="flex items-center justify-between">
                  <span>{found.source}</span>
                  <span>Last queried {fmtTimestamp(found.fetched_at)}</span>
                </div>
              </div>
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}

function verdictColorClass(tier: GaugeVerdict): string {
  if (tier === 'success') return 'text-[color:var(--success)]';
  if (tier === 'warn') return 'text-[color:var(--warn)]';
  if (tier === 'danger') return 'text-[color:var(--danger)]';
  return 'text-accent-ink dark:text-accent';
}
