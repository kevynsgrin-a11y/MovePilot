import { useEffect, useMemo, useState } from 'react';
import { Scale, AlertTriangle, Zap } from 'lucide-react';
import { api, ApiError, type DimWeightResult } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { StatTile } from '@/components/ui/StatTile';
import { SegmentedControl, type SegmentOption } from '@/components/ui/SegmentedControl';
import { Badge } from '@/components/ui/Badge';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Button } from '@/components/ui/Button';

/**
 * /tools/weight — Dimensional weight (§3.3). Left: L/W/H inputs + a divisor selector
 * (139 / 166 default / 194). Right: the dimensional_weight_lbs data-hero readout plus
 * a DIY-truck-vs-LTL billable-weight comparison bar. All figures come from
 * POST /api/calc/dimensional-weight — the two comparison bars are two REAL calls at
 * the parcel-ground (÷194) and LTL-freight (÷166) divisors, never fabricated prices.
 */

type Divisor = 139 | 166 | 194;

const DIVISORS: SegmentOption<string>[] = [
  { value: '139', label: '139' },
  { value: '166', label: '166' },
  { value: '194', label: '194' },
];

// The two shipping modes compared in the bars, each pegged to its real dimensional
// divisor. Lower billable weight = cheaper to ship = "Best value".
const MODES: { key: 'diy' | 'ltl'; label: string; divisor: Divisor; note: string }[] = [
  { key: 'diy', label: 'DIY / ground', divisor: 194, note: '÷194 ground' },
  { key: 'ltl', label: 'LTL freight', divisor: 166, note: '÷166 freight' },
];

const SAMPLE = { l: '48', w: '40', h: '36' }; // a standard pallet-ish carton

function errMsg(e: unknown): string {
  return e instanceof ApiError ? e.message : 'Something went wrong — please try again.';
}

function toNum(s: string): number | null {
  if (s.trim() === '') return null;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function Weight() {
  const [l, setL] = useState('');
  const [w, setW] = useState('');
  const [h, setH] = useState('');
  const [divisor, setDivisor] = useState<Divisor>(166);

  const [result, setResult] = useState<DimWeightResult | null>(null);
  const [modes, setModes] = useState<Record<'diy' | 'ltl', DimWeightResult | null>>({
    diy: null,
    ltl: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dims = useMemo(() => {
    const L = toNum(l);
    const W = toNum(w);
    const H = toNum(h);
    return L && W && H ? { length_in: L, width_in: W, height_in: H } : null;
  }, [l, w, h]);

  const sig = dims ? `${dims.length_in}x${dims.width_in}x${dims.height_in}:${divisor}` : '';

  useEffect(() => {
    if (!dims) {
      setResult(null);
      setModes({ diy: null, ltl: null });
      setError(null);
      setLoading(false);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    const t = setTimeout(() => {
      Promise.all([
        api.calc.dimensionalWeight({ ...dims, divisor }, ctrl.signal),
        api.calc.dimensionalWeight({ ...dims, divisor: MODES[0].divisor }, ctrl.signal),
        api.calc.dimensionalWeight({ ...dims, divisor: MODES[1].divisor }, ctrl.signal),
      ])
        .then(([sel, diy, ltl]) => {
          if (ctrl.signal.aborted) return;
          setResult(sel);
          setModes({ diy, ltl });
          setError(null);
        })
        .catch((e) => {
          if (ctrl.signal.aborted) return;
          setError(errMsg(e));
          setResult(null);
          setModes({ diy: null, ltl: null });
        })
        .finally(() => {
          if (!ctrl.signal.aborted) setLoading(false);
        });
    }, 350);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  const modeWeights = MODES.map((m) => ({ ...m, lbs: modes[m.key]?.dimensional_weight_lbs ?? null }));
  const resolvedWeights = modeWeights.filter((m) => typeof m.lbs === 'number') as (typeof modeWeights[number] & {
    lbs: number;
  })[];
  const maxLbs = resolvedWeights.reduce((mx, m) => Math.max(mx, m.lbs), 0);
  const cheapestKey =
    resolvedWeights.length === MODES.length
      ? resolvedWeights.reduce((best, m) => (m.lbs < best.lbs ? m : best), resolvedWeights[0]).key
      : null;

  const loadSample = () => {
    setL(SAMPLE.l);
    setW(SAMPLE.w);
    setH(SAMPLE.h);
  };

  return (
    <div className="container-mp py-12 md:py-20">
      <header className="flex flex-col gap-3">
        <Eyebrow>Dimensional weight</Eyebrow>
        <h1 className="font-display text-h2 font-medium text-text">
          What carriers actually bill — not what the scale says.
        </h1>
        <p className="max-w-prose text-body-lg text-text-muted">
          Freight and parcel carriers charge on the greater of actual and{' '}
          <em>dimensional</em> weight. Enter a carton&apos;s dimensions to see the billable figure
          for each mode.
        </p>
      </header>

      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.1fr]">
        {/* ---------------- INPUTS (left) ---------------- */}
        <Card padding="lg" className="rounded-xl">
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Input
                label="Length"
                inputMode="decimal"
                placeholder="48"
                value={l}
                onChange={(e) => setL(e.target.value)}
                suffix="in"
              />
              <Input
                label="Width"
                inputMode="decimal"
                placeholder="40"
                value={w}
                onChange={(e) => setW(e.target.value)}
                suffix="in"
              />
              <Input
                label="Height"
                inputMode="decimal"
                placeholder="36"
                value={h}
                onChange={(e) => setH(e.target.value)}
                suffix="in"
              />
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-body-sm font-medium text-text">Dimensional divisor</span>
              <SegmentedControl
                ariaLabel="Dimensional divisor"
                options={DIVISORS}
                value={String(divisor)}
                onChange={(v) => setDivisor(Number(v) as Divisor)}
                block
              />
              <p className="text-caption text-text-faint">
                139 = air express · 166 = standard (default) · 194 = ground.
              </p>
            </div>

            {!dims && (
              <div className="flex items-center justify-between gap-3 rounded-md border border-[color:var(--border)] bg-surface-sunk px-4 py-3">
                <p className="flex items-center gap-2 text-body-sm text-text-muted">
                  <Scale size={18} aria-hidden="true" className="text-text-faint" />
                  Enter all three dimensions to calculate.
                </p>
                <Button variant="secondary" size="sm" onClick={loadSample}>
                  Load a sample carton
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* ---------------- READOUT (right) ---------------- */}
        <Card padding="lg" className="rounded-xl lg:sticky lg:top-20 lg:self-start">
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <StatTile
                label={`Dimensional weight (÷${divisor})`}
                value={result?.dimensional_weight_lbs ?? null}
                loading={loading && !result}
                unit="lb"
                size="lg"
                ariaLabel={
                  result ? `${Math.round(result.dimensional_weight_lbs)} pounds billable weight` : undefined
                }
              />
              <StatTile
                label="Cubic inches"
                value={result?.cubic_inches ?? null}
                loading={loading && !result}
                unit="in³"
              />
            </div>

            {error && (
              <p className="flex items-center gap-2 rounded-md border border-[color:var(--danger)]/35 bg-[color:var(--danger)]/10 px-3 py-2 text-body-sm text-[color:var(--danger)]">
                <AlertTriangle size={16} aria-hidden="true" />
                {error}
              </p>
            )}

            {/* DIY-vs-LTL comparison bars */}
            <div className="flex flex-col gap-3">
              <h2 className="text-caption font-semibold uppercase tracking-[0.08em] text-text-faint">
                Billable weight by mode
              </h2>
              {loading && resolvedWeights.length === 0 ? (
                <div aria-busy="true" className="flex flex-col gap-4">
                  <span className="sr-only">Comparing shipping modes…</span>
                  {MODES.map((m) => (
                    <div key={m.key} className="flex flex-col gap-1.5">
                      <div className="h-4 w-24 skeleton" />
                      <div className="h-7 w-full skeleton" />
                    </div>
                  ))}
                </div>
              ) : resolvedWeights.length === 0 ? (
                <p className="text-body-sm text-text-faint">
                  Enter dimensions to compare DIY-ground and LTL-freight billable weight.
                </p>
              ) : (
                <ul className="flex flex-col gap-4">
                  {modeWeights.map((m) => {
                    const isBest = cheapestKey === m.key;
                    const pct = maxLbs > 0 && m.lbs ? Math.max(6, (m.lbs / maxLbs) * 100) : 0;
                    return (
                      <li key={m.key} className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-2 text-body-sm font-medium text-text">
                            {m.label}
                            <span className="text-caption text-text-faint">{m.note}</span>
                          </span>
                          <span className="flex items-center gap-2">
                            {isBest && (
                              <Badge tone="accent" icon={<Zap aria-hidden="true" />}>
                                Best value
                              </Badge>
                            )}
                            <span className="tabular text-body-sm font-semibold text-text">
                              {m.lbs != null ? `${Math.round(m.lbs).toLocaleString('en-US')} lb` : '—'}
                            </span>
                          </span>
                        </div>
                        <div className="h-7 w-full overflow-hidden rounded-sm bg-surface-sunk">
                          <div
                            className="h-full rounded-sm"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: isBest ? 'var(--accent)' : 'var(--border-strong)',
                              transition: 'width 420ms var(--ease-out-quart)',
                            }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
              <p className="text-caption text-text-faint">
                Bars show dimensional (billable) weight at each mode&apos;s standard divisor — a lower
                billable weight is cheaper to ship. Figures are computed server-side, not price quotes.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
