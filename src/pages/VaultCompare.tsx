import { useMemo, useState, type FormEvent } from 'react';
import { Scale, AlertTriangle, Trophy, SlidersHorizontal } from 'lucide-react';
import { api, ApiError, type ScenarioResult } from '@/lib/api';
import { Button, Card, Input, Badge, Eyebrow, Skeleton } from '@/components/ui';
import {
  SignInGate,
  PremiumGate,
  isUnauth,
  isPremiumRequired,
} from '@/components/vault/VaultGate';

/**
 * /dashboard/vault/compare (§3.10) — the multi-scenario cost table. POST
 * /api/vault/scenario returns scenarios[] (column-per-scenario) + ranked[]
 * (cheapest-first). The recommended column (ranked[0]) is highlighted; the total
 * row is bold + sticky; currency is right-aligned tabular. Every number is fetched.
 */

type Gate = 'signin' | 'premium' | null;

function errMsg(e: unknown): string {
  return e instanceof ApiError ? e.message : 'Something went wrong — please try again.';
}
function usd(n: number): string {
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

// Union of line-item labels across scenarios, preserving first-seen order.
function driverRows(data: ScenarioResult): string[] {
  const seen: string[] = [];
  for (const s of data.scenarios) {
    for (const li of s.line_items) if (!seen.includes(li.label)) seen.push(li.label);
  }
  return seen;
}

function amountFor(data: ScenarioResult, scenarioName: string, label: string): number | null {
  const s = data.scenarios.find((x) => x.name === scenarioName);
  const li = s?.line_items.find((x) => x.label === label);
  return li ? li.amount_usd : null;
}

function ScenarioTable({ data }: { data: ScenarioResult }) {
  const recommended = data.ranked[0];
  const rows = driverRows(data);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[36rem] border-collapse text-body-sm">
        <caption className="sr-only">
          Cost by scenario and cost driver. Recommended: {recommended}.
        </caption>
        <thead>
          <tr className="border-b border-[color:var(--border-strong)]">
            <th scope="col" className="py-3 pr-3 text-left text-caption font-semibold uppercase tracking-[0.06em] text-text-faint">
              Cost driver
            </th>
            {data.scenarios.map((s) => {
              const isRec = s.name === recommended;
              return (
                <th
                  key={s.name}
                  scope="col"
                  className={
                    'py-3 px-3 text-right align-bottom ' +
                    (isRec ? 'bg-accent/10' : '')
                  }
                >
                  <span className="flex flex-col items-end gap-1">
                    <span className="text-h5 font-semibold text-text">{s.name}</span>
                    {isRec && (
                      <Badge tone="accent" icon={<Trophy />}>
                        Recommended
                      </Badge>
                    )}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="tabular">
          {rows.map((label) => (
            <tr key={label} className="border-b border-[color:var(--border)]">
              <th scope="row" className="py-2.5 pr-3 text-left font-medium text-text-muted">
                {label}
              </th>
              {data.scenarios.map((s) => {
                const amt = amountFor(data, s.name, label);
                const isRec = s.name === recommended;
                return (
                  <td
                    key={s.name}
                    className={
                      'py-2.5 px-3 text-right ' +
                      (isRec ? 'bg-accent/[0.06] font-medium text-text' : 'text-text-muted')
                    }
                  >
                    {amt === null ? <span className="text-text-faint">—</span> : usd(amt)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="sticky bottom-0 border-t-2 border-[color:var(--border-strong)] bg-surface">
            <th scope="row" className="py-3 pr-3 text-left text-body font-semibold text-text">
              Total
            </th>
            {data.scenarios.map((s) => {
              const isRec = s.name === recommended;
              return (
                <td
                  key={s.name}
                  className={
                    'py-3 px-3 text-right text-body font-bold tabular ' +
                    (isRec ? 'bg-accent/10 text-accent-ink dark:text-accent' : 'text-text')
                  }
                >
                  {usd(s.total_usd)}
                </td>
              );
            })}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// Sample — rendered ONLY inside PremiumGate (labelled "Sample data").
const SAMPLE: ScenarioResult = {
  scenarios: [
    {
      name: 'DIY truck',
      line_items: [
        { label: 'Truck rental', amount_usd: 1150 },
        { label: 'Fuel', amount_usd: 430 },
        { label: 'Labor', amount_usd: 600 },
      ],
      total_usd: 2180,
    },
    {
      name: 'Container',
      line_items: [
        { label: 'Container', amount_usd: 2100 },
        { label: 'Fuel', amount_usd: 0 },
        { label: 'Labor', amount_usd: 950 },
      ],
      total_usd: 3050,
    },
    {
      name: 'Full-service',
      line_items: [
        { label: 'Transport', amount_usd: 3200 },
        { label: 'Labor', amount_usd: 1220 },
      ],
      total_usd: 4420,
    },
  ],
  ranked: ['DIY truck', 'Container', 'Full-service'],
};

export function VaultCompare() {
  const [distance, setDistance] = useState('');
  const [labor, setLabor] = useState('');
  const [weight, setWeight] = useState('');

  const [data, setData] = useState<ScenarioResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gate, setGate] = useState<Gate>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const recommended = useMemo(() => (data ? data.ranked[0] : null), [data]);

  const run = async (e: FormEvent) => {
    e.preventDefault();
    const d = Number(distance);
    const l = Number(labor);
    const w = Number(weight);
    if (!(d > 0) || !(w > 0) || !(l >= 0)) {
      setFieldError('Enter a positive distance and weight, and a non-negative labor-hours value.');
      return;
    }
    setFieldError(null);
    setLoading(true);
    setError(null);
    setGate(null);
    try {
      const r = await api.vault.scenario({ distance_miles: d, labor_hours: l, weight_lbs: w });
      setData(r);
    } catch (err) {
      if (isUnauth(err)) setGate('signin');
      else if (isPremiumRequired(err)) setGate('premium');
      else setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  if (gate === 'signin') return <SignInGate feature="Scenario comparison" />;
  if (gate === 'premium')
    return (
      <PremiumGate
        title="DIY, container, or full-service — priced side by side."
        description="Enter your distance, weight, and labor hours. We break every scenario into its cost drivers and highlight the cheapest, so the trade-off is a table, not a guess."
        onUnlocked={() => setGate(null)}
        sample={<ScenarioTable data={SAMPLE} />}
      />
    );

  return (
    <div className="container-mp py-12 md:py-20">
      <header className="flex flex-col gap-3">
        <Eyebrow className="!text-copper">Relocation Vault</Eyebrow>
        <h1 className="flex items-center gap-2.5 font-display text-h2 font-medium text-text">
          <Scale size={28} aria-hidden="true" className="text-copper" />
          Compare your options
        </h1>
        <p className="max-w-prose text-body-lg text-text-muted">
          DIY truck, portable container, or full-service — priced by cost driver, with the cheapest
          scenario recommended. The math runs server-side; nothing here is estimated in your browser.
        </p>
      </header>

      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.6fr]">
        {/* Inputs */}
        <Card padding="lg" className="rounded-xl lg:sticky lg:top-20 lg:self-start">
          <form className="flex flex-col gap-4" onSubmit={run}>
            <h2 className="flex items-center gap-2 text-h5 font-semibold text-text">
              <SlidersHorizontal size={18} aria-hidden="true" className="text-text-faint" />
              Move parameters
            </h2>
            <Input
              label="Distance (miles)"
              inputMode="decimal"
              placeholder="e.g. 870"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
            />
            <Input
              label="Shipping weight (lb)"
              inputMode="decimal"
              placeholder="e.g. 5900"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
            <Input
              label="Labor hours"
              inputMode="decimal"
              placeholder="e.g. 8"
              value={labor}
              onChange={(e) => setLabor(e.target.value)}
              hint="Loading + unloading help, in hours."
            />
            <Button type="submit" block loading={loading}>
              Compare scenarios
            </Button>
            {fieldError && (
              <p className="flex items-center gap-1.5 text-body-sm text-[color:var(--danger)]">
                <AlertTriangle size={15} aria-hidden="true" />
                {fieldError}
              </p>
            )}
          </form>
        </Card>

        {/* Results */}
        <Card padding="lg" className="rounded-xl">
          {loading ? (
            <div aria-busy="true" className="flex flex-col gap-3">
              <span className="sr-only">Comparing scenarios…</span>
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-start gap-3">
              <p className="flex items-center gap-2 text-body-sm text-[color:var(--danger)]">
                <AlertTriangle size={16} aria-hidden="true" />
                {error}
              </p>
              <Button size="sm" variant="secondary" onClick={() => setError(null)}>
                Dismiss
              </Button>
            </div>
          ) : data ? (
            <div className="flex flex-col gap-4">
              {recommended && (
                <p role="status" className="flex items-center gap-2 text-body-sm text-text-muted">
                  <Trophy size={16} aria-hidden="true" className="text-accent-ink dark:text-accent" />
                  Cheapest option:{' '}
                  <span className="font-semibold text-text">{recommended}</span>
                </p>
              )}
              <ScenarioTable data={data} />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Scale size={28} aria-hidden="true" className="text-text-faint" />
              <p className="max-w-xs text-body text-text-muted">
                Enter your distance, weight, and labor hours to compare DIY, container, and
                full-service side by side.
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
