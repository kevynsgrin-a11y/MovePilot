import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  Vault as VaultIcon,
  Plus,
  Trash2,
  AlertTriangle,
  Check,
  ShieldAlert,
  FileText,
  Info,
} from 'lucide-react';
import {
  api,
  ApiError,
  type VaultQuote,
  type VaultQuoteInput,
} from '@/lib/api';
import { Button, Card, Input, Badge, Eyebrow, Skeleton } from '@/components/ui';
import {
  SignInGate,
  PremiumGate,
  isUnauth,
  isPremiumRequired,
} from '@/components/vault/VaultGate';

/**
 * /dashboard/vault (§3.10) — the premium normalized-quote table. GET/POST
 * /api/vault/quotes. Each row shows the backend-computed implied density and an
 * amber "⚠ Flagged" anomaly chip (never a bare red cell). The anomaly/density math
 * is the backend's — the client only submits the typed numbers (+ optional pasted
 * quote text) and renders what comes back. 402 → preview-with-sample + unlock.
 */

type Gate = 'signin' | 'premium' | null;

function errMsg(e: unknown): string {
  return e instanceof ApiError ? e.message : 'Something went wrong — please try again.';
}
function usd(n?: number): string {
  return typeof n === 'number' ? `$${n.toLocaleString('en-US')}` : '—';
}
function num(n?: number, unit = ''): string {
  return typeof n === 'number' ? `${n.toLocaleString('en-US')}${unit}` : '—';
}

function QuoteTable({
  quotes,
  onDelete,
  deletingId,
}: {
  quotes: VaultQuote[];
  onDelete?: (id: string) => void;
  deletingId?: string | null;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[42rem] border-collapse text-body-sm">
        <caption className="sr-only">Normalized carrier quotes with implied density and anomaly flags</caption>
        <thead>
          <tr className="border-b border-[color:var(--border-strong)] text-left text-caption uppercase tracking-[0.06em] text-text-faint">
            <th scope="col" className="py-2 pr-3 font-semibold">Mover</th>
            <th scope="col" className="py-2 px-3 text-right font-semibold">Price</th>
            <th scope="col" className="py-2 px-3 text-right font-semibold">Weight</th>
            <th scope="col" className="py-2 px-3 text-right font-semibold">Volume</th>
            <th scope="col" className="py-2 px-3 text-right font-semibold">Density</th>
            <th scope="col" className="py-2 px-3 font-semibold">Status</th>
            {onDelete && <th scope="col" className="py-2 pl-3 text-right font-semibold">·</th>}
          </tr>
        </thead>
        <tbody className="tabular">
          {quotes.map((q) => (
            <tr key={q.id} className="border-b border-[color:var(--border)] align-middle">
              <td className="py-3 pr-3">
                <p className="font-semibold text-text">{q.mover_name}</p>
                {q.mover_usdot && (
                  <p className="data-raw text-caption text-text-faint">USDOT {q.mover_usdot}</p>
                )}
              </td>
              <td className="py-3 px-3 text-right font-medium text-text">{usd(q.quoted_price_usd)}</td>
              <td className="py-3 px-3 text-right text-text-muted">{num(q.quoted_weight_lbs, ' lb')}</td>
              <td className="py-3 px-3 text-right text-text-muted">{num(q.quoted_volume_cuft, ' cu ft')}</td>
              <td className="py-3 px-3 text-right text-text">
                {typeof q.implied_density === 'number' ? q.implied_density.toFixed(2) : '—'}
                {typeof q.implied_density === 'number' && (
                  <span className="text-text-faint"> lb/ft³</span>
                )}
              </td>
              <td className="py-3 px-3">
                {q.is_anomalous ? (
                  <span title={q.anomaly_reason} className="inline-flex flex-col items-start gap-0.5">
                    <Badge tone="warn" icon={<ShieldAlert />}>
                      Flagged
                    </Badge>
                    {q.anomaly_reason && (
                      <span className="text-caption text-text-faint">{q.anomaly_reason}</span>
                    )}
                  </span>
                ) : (
                  <Badge tone="success" icon={<Check />}>
                    In range
                  </Badge>
                )}
              </td>
              {onDelete && (
                <td className="py-3 pl-3 text-right">
                  <button
                    type="button"
                    onClick={() => onDelete(q.id)}
                    disabled={deletingId === q.id}
                    aria-label={`Delete quote from ${q.mover_name}`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-[color:var(--border-strong)] text-[color:var(--danger)] transition-colors hover:bg-[color:var(--danger)]/10 disabled:opacity-50"
                  >
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Sample rows for the 402 preview — shown ONLY inside PremiumGate, which labels the
// whole block "Sample data". These illustrate layout; they are never treated as real.
const SAMPLE_QUOTES: VaultQuote[] = [
  {
    id: 's1',
    mover_name: 'Summit Van Lines',
    mover_usdot: '1523421',
    quoted_price_usd: 4200,
    quoted_weight_lbs: 5900,
    quoted_volume_cuft: 840,
    implied_density: 7.02,
    is_anomalous: false,
  },
  {
    id: 's2',
    mover_name: 'BudgetHaul Movers',
    mover_usdot: '2894110',
    quoted_price_usd: 2650,
    quoted_weight_lbs: 4100,
    quoted_volume_cuft: 840,
    implied_density: 4.88,
    is_anomalous: true,
    anomaly_reason: 'Implied density below expected range',
  },
];

const emptyForm: VaultQuoteInput = { mover_name: '' };

export function Vault() {
  const [quotes, setQuotes] = useState<VaultQuote[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gate, setGate] = useState<Gate>(null);
  const [reload, setReload] = useState(0);

  const [form, setForm] = useState<VaultQuoteInput>(emptyForm);
  const [showText, setShowText] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    setGate(null);
    api.vault
      .listQuotes()
      .then((d) => setQuotes(d.quotes))
      .catch((e) => {
        if (ctrl.signal.aborted) return;
        if (isUnauth(e)) setGate('signin');
        else if (isPremiumRequired(e)) setGate('premium');
        else setError(errMsg(e));
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, [reload]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.mover_name.trim()) {
      setFormError('Enter the mover name.');
      return;
    }
    const body: VaultQuoteInput = {
      mover_name: form.mover_name.trim(),
      mover_usdot: form.mover_usdot?.trim() || undefined,
      quoted_price_usd: form.quoted_price_usd,
      quoted_weight_lbs: form.quoted_weight_lbs,
      quoted_volume_cuft: form.quoted_volume_cuft,
      extracted_text: form.extracted_text?.trim() || undefined,
    };
    setSubmitting(true);
    setFormError(null);
    try {
      const created = await api.vault.createQuote(body);
      setQuotes((prev) => [created, ...(prev ?? [])]);
      setForm(emptyForm);
      setShowText(false);
    } catch (err) {
      if (isPremiumRequired(err)) setGate('premium');
      else setFormError(errMsg(err));
    } finally {
      setSubmitting(false);
    }
  };

  const del = useCallback(async (id: string) => {
    setDeletingId(id);
    try {
      await api.vault.removeQuote(id);
      setQuotes((prev) => (prev ? prev.filter((q) => q.id !== id) : prev));
    } catch {
      /* leave the row; a transient failure shouldn't drop real data */
    } finally {
      setDeletingId(null);
    }
  }, []);

  const numField =
    (key: 'quoted_price_usd' | 'quoted_weight_lbs' | 'quoted_volume_cuft') =>
    (raw: string) => {
      const v = raw.trim() === '' ? undefined : Number(raw);
      setForm((f) => ({ ...f, [key]: Number.isFinite(v as number) ? (v as number) : undefined }));
    };

  if (gate === 'signin') return <SignInGate feature="The Relocation Vault" />;
  if (gate === 'premium')
    return (
      <PremiumGate
        title="Catch the quote that doesn't add up."
        description="Drop in every mover's quote. We normalize price, weight, and volume to an implied density and flag any outlier — so a lowball with impossible math can't slip through."
        onUnlocked={() => setReload((n) => n + 1)}
        sample={<QuoteTable quotes={SAMPLE_QUOTES} />}
      />
    );

  return (
    <div className="container-mp py-12 md:py-20">
      <header className="flex flex-col gap-3">
        <Eyebrow className="!text-copper">Relocation Vault</Eyebrow>
        <h1 className="flex items-center gap-2.5 font-display text-h2 font-medium text-text">
          <VaultIcon size={28} aria-hidden="true" className="text-copper" />
          Quote radar
        </h1>
        <p className="max-w-prose text-body-lg text-text-muted">
          Add each carrier&apos;s quote. We compute the implied density server-side and flag
          anomalies — a lowball with impossible weight-to-volume math shows up amber.
        </p>
      </header>

      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.5fr]">
        {/* Add-quote form */}
        <Card padding="lg" className="rounded-xl lg:sticky lg:top-20 lg:self-start">
          <form className="flex flex-col gap-4" onSubmit={submit}>
            <h2 className="text-h5 font-semibold text-text">Add a quote</h2>
            <Input
              label="Mover name"
              placeholder="e.g. Summit Van Lines"
              value={form.mover_name}
              onChange={(e) => setForm((f) => ({ ...f, mover_name: e.target.value }))}
              required
            />
            <Input
              label="USDOT number (optional)"
              inputMode="numeric"
              placeholder="e.g. 1523421"
              value={form.mover_usdot ?? ''}
              onChange={(e) =>
                setForm((f) => ({ ...f, mover_usdot: e.target.value.replace(/\D/g, '') }))
              }
              className="data-raw"
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Input
                label="Price ($)"
                inputMode="decimal"
                placeholder="4200"
                value={form.quoted_price_usd ?? ''}
                onChange={(e) => numField('quoted_price_usd')(e.target.value)}
              />
              <Input
                label="Weight (lb)"
                inputMode="decimal"
                placeholder="5900"
                value={form.quoted_weight_lbs ?? ''}
                onChange={(e) => numField('quoted_weight_lbs')(e.target.value)}
              />
              <Input
                label="Volume (ft³)"
                inputMode="decimal"
                placeholder="840"
                value={form.quoted_volume_cuft ?? ''}
                onChange={(e) => numField('quoted_volume_cuft')(e.target.value)}
              />
            </div>

            <button
              type="button"
              onClick={() => setShowText((s) => !s)}
              className="flex items-center gap-1.5 self-start text-body-sm font-medium text-accent-ink underline-offset-4 hover:underline dark:text-accent"
            >
              <FileText size={15} aria-hidden="true" />
              {showText ? 'Hide' : 'Paste'} quote text (optional)
            </button>
            {showText && (
              <label className="flex flex-col gap-1.5">
                <span className="sr-only">Pasted quote text</span>
                <textarea
                  value={form.extracted_text ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, extracted_text: e.target.value }))}
                  rows={4}
                  placeholder="Paste the raw text from a PDF or email quote — we keep it with the record for reference."
                  className="w-full rounded-sm border-[1.5px] border-[color:var(--border-strong)] bg-surface px-3 py-2.5 text-body-sm text-text outline-none placeholder:text-text-faint focus:border-[color:var(--accent)]"
                />
              </label>
            )}

            <p className="flex items-start gap-1.5 text-caption text-text-faint">
              <Info size={14} aria-hidden="true" className="mt-0.5 shrink-0" />
              Enter price, weight, and volume to get an anomaly check. The density math runs on our
              server — never in your browser.
            </p>

            <Button type="submit" block loading={submitting}>
              <Plus size={16} aria-hidden="true" />
              Add quote
            </Button>
            {formError && (
              <p className="flex items-center gap-1.5 text-body-sm text-[color:var(--danger)]">
                <AlertTriangle size={15} aria-hidden="true" />
                {formError}
              </p>
            )}
          </form>
        </Card>

        {/* Quote table */}
        <Card padding="lg" className="rounded-xl">
          {loading && !quotes ? (
            <div aria-busy="true" className="flex flex-col gap-3">
              <span className="sr-only">Loading your saved quotes…</span>
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-start gap-3">
              <p className="flex items-center gap-2 text-body-sm text-[color:var(--danger)]">
                <AlertTriangle size={16} aria-hidden="true" />
                Couldn&apos;t load your quotes. {error}
              </p>
              <Button size="sm" variant="secondary" onClick={() => setReload((n) => n + 1)}>
                Retry
              </Button>
            </div>
          ) : quotes && quotes.length > 0 ? (
            <QuoteTable quotes={quotes} onDelete={del} deletingId={deletingId} />
          ) : (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <ShieldAlert size={28} aria-hidden="true" className="text-text-faint" />
              <p className="text-body text-text-muted">
                No quotes yet. Add your first carrier quote to start the anomaly check.
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
