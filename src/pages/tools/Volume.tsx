import { useEffect, useMemo, useState } from 'react';
import { Boxes, Plus, Minus, Search, Save, Package, Check, ArrowRight, AlertTriangle } from 'lucide-react';
import {
  api,
  ApiError,
  getAuthToken,
  setAuthToken,
  type CatalogItem,
  type CatalogResult,
  type VolumeResult,
  type VolumeItemInput,
  type InventorySaveResult,
} from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { StatTile } from '@/components/ui/StatTile';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { Eyebrow } from '@/components/ui/Eyebrow';

/**
 * /tools/volume — Inventory → Volume (§3.3). Left: an item picker whose list is
 * fetched from GET /api/catalog/items (never client-invented) plus small/medium/large
 * box steppers. Right: the faceted box glyph filling teal as cu-ft accrue, with
 * total_cuft / total_cbm data-hero readouts fetched from POST /api/calc/volume.
 * Every number is fetched — nothing is computed in the component.
 */

const BOX_KEYS = ['small', 'medium', 'large'];

function errMsg(e: unknown): string {
  return e instanceof ApiError ? e.message : 'Something went wrong — please try again.';
}

// The faceted volume glyph (§2.7.4): an isometric box that fills translucent teal as
// cubic feet accrue. `fill` is a 0..1 fraction of a reference capacity; purely a
// visual — the authoritative figures are the fetched total_cuft / total_cbm.
function FacetedBox({ fill }: { fill: number }) {
  const clamped = Math.min(1, Math.max(0, fill));
  const frontH = 100;
  const fillH = frontH * clamped;
  const fillY = 170 - fillH;
  return (
    <svg viewBox="0 0 220 210" className="h-auto w-full max-w-[280px]" role="img" aria-label="Cubic-volume fill indicator">
      <defs>
        <linearGradient id="fbox-fill" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.42" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.14" />
        </linearGradient>
        <clipPath id="fbox-front">
          <rect x={40} y={70} width={100} height={100} />
        </clipPath>
      </defs>

      {/* Filling front face (clipped to the square) */}
      <g clipPath="url(#fbox-front)">
        <rect
          x={40}
          y={fillY}
          width={100}
          height={fillH}
          fill="url(#fbox-fill)"
          style={{ transition: 'y 420ms var(--ease-out-quart), height 420ms var(--ease-out-quart)' }}
        />
      </g>

      {/* Wireframe */}
      <g fill="none" stroke="var(--accent)" strokeOpacity={0.55} strokeWidth={1.5} strokeLinejoin="round">
        {/* front */}
        <rect x={40} y={70} width={100} height={100} />
        {/* top */}
        <path d="M40 70 L90 40 L190 40 L140 70 Z" />
        {/* right */}
        <path d="M140 70 L190 40 L190 140 L140 170 Z" />
      </g>

      {/* Instrument tick-marks down the front-left edge */}
      <g stroke="var(--border-strong)" strokeWidth={1}>
        {[0, 1, 2, 3, 4].map((i) => (
          <line key={i} x1={40} y1={70 + i * 25} x2={46} y2={70 + i * 25} />
        ))}
      </g>
    </svg>
  );
}

function Stepper({
  label,
  sublabel,
  qty,
  onChange,
}: {
  label: string;
  sublabel?: string;
  qty: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-[color:var(--border)] bg-surface px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-body-sm font-medium text-text">{label}</p>
        {sublabel && <p className="text-caption text-text-faint tabular">{sublabel}</p>}
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, qty - 1))}
          disabled={qty === 0}
          aria-label={`Remove one ${label}`}
          className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-[color:var(--border-strong)] text-text-muted transition-colors hover:bg-surface-sunk disabled:opacity-40"
        >
          <Minus size={16} aria-hidden="true" />
        </button>
        <span className="w-7 text-center text-body font-semibold tabular text-text" aria-live="polite">
          {qty}
        </span>
        <button
          type="button"
          onClick={() => onChange(qty + 1)}
          aria-label={`Add one ${label}`}
          className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-[color:var(--border-strong)] text-text-muted transition-colors hover:bg-surface-sunk"
        >
          <Plus size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export function Volume() {
  // Catalog
  const [catalog, setCatalog] = useState<CatalogResult | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogReload, setCatalogReload] = useState(0);

  // Quantities: catalog key -> quantity
  const [qty, setQty] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState('');

  // Result
  const [result, setResult] = useState<VolumeResult | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcError, setCalcError] = useState<string | null>(null);

  // Save
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState<InventorySaveResult | null>(null);

  // Load catalog
  useEffect(() => {
    const ctrl = new AbortController();
    setCatalogLoading(true);
    setCatalogError(null);
    api.catalog
      .items(ctrl.signal)
      .then((c) => setCatalog(c))
      .catch((e) => {
        if (!ctrl.signal.aborted) setCatalogError(errMsg(e));
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setCatalogLoading(false);
      });
    return () => ctrl.abort();
  }, [catalogReload]);

  const boxItems = useMemo(
    () => (catalog?.items ?? []).filter((i) => BOX_KEYS.includes(i.key)),
    [catalog],
  );
  const namedItems = useMemo(
    () => (catalog?.items ?? []).filter((i) => !BOX_KEYS.includes(i.key)),
    [catalog],
  );

  const filteredNamed = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return namedItems;
    return namedItems.filter((i) => i.label.toLowerCase().includes(q) || i.key.toLowerCase().includes(q));
  }, [namedItems, filter]);

  // Active item inputs for the POST body (qty > 0)
  const activeItems: VolumeItemInput[] = useMemo(
    () =>
      Object.entries(qty)
        .filter(([, n]) => n > 0)
        .map(([key, n]) => ({ key, quantity: n })),
    [qty],
  );
  const hasItems = activeItems.length > 0;

  // Debounced POST /api/calc/volume on every change
  const itemsSig = useMemo(
    () => activeItems.map((i) => `${i.key}:${i.quantity}`).sort().join(','),
    [activeItems],
  );
  useEffect(() => {
    if (!hasItems) {
      setResult(null);
      setCalcError(null);
      setCalcLoading(false);
      return;
    }
    const ctrl = new AbortController();
    setCalcLoading(true);
    const t = setTimeout(() => {
      api.calc
        .volume(activeItems, ctrl.signal)
        .then((r) => {
          if (ctrl.signal.aborted) return;
          setResult(r);
          setCalcError(null);
        })
        .catch((e) => {
          if (ctrl.signal.aborted) return;
          setCalcError(errMsg(e));
          setResult(null);
        })
        .finally(() => {
          if (!ctrl.signal.aborted) setCalcLoading(false);
        });
    }, 350);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsSig]);

  const setKey = (key: string, n: number) => {
    setSaved(null);
    setQty((prev) => ({ ...prev, [key]: n }));
  };

  // "Load a 2-bedroom sample" — seed from bedroom_presets.two.items (catalog-sourced)
  const loadSample = () => {
    const preset = catalog?.bedroom_presets?.two;
    if (!preset) return;
    const next: Record<string, number> = {};
    for (const key of preset.items) next[key] = (next[key] ?? 0) + 1;
    setSaved(null);
    setQty(next);
  };

  const clearAll = () => {
    setSaved(null);
    setQty({});
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      if (!getAuthToken()) {
        const s = await api.session.anon();
        setAuthToken(s.session_token);
      }
      const r = await api.inventory.save({ name: '2-bedroom move', items: activeItems });
      setSaved(r);
    } catch (e) {
      setSaveError(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const fillFraction = (result?.total_cuft ?? 0) / 1600;

  return (
    <div className="container-mp py-12 md:py-20">
      <header className="flex flex-col gap-3">
        <Eyebrow>Inventory → Volume</Eyebrow>
        <h1 className="font-display text-h2 font-medium text-text">What will your move actually fill?</h1>
        <p className="max-w-prose text-body-lg text-text-muted">
          Add your furniture and boxes. We total the exact cubic feet server-side — never estimated
          in your browser.
        </p>
      </header>

      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_1fr]">
        {/* ---------------- INPUTS (left) ---------------- */}
        <Card padding="lg" className="rounded-xl">
          {catalogLoading ? (
            <div aria-busy="true" className="flex flex-col gap-3">
              <span className="sr-only">Loading the item catalog…</span>
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : catalogError ? (
            <div className="flex flex-col items-start gap-3 rounded-md border border-[color:var(--danger)]/35 bg-[color:var(--danger)]/10 p-4">
              <p className="flex items-center gap-2 text-body-sm text-[color:var(--danger)]">
                <AlertTriangle size={16} aria-hidden="true" />
                Couldn&apos;t load the item catalog. {catalogError}
              </p>
              <Button size="sm" variant="secondary" onClick={() => setCatalogReload((n) => n + 1)}>
                Retry
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Boxes */}
              {boxItems.length > 0 && (
                <section className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-h5 font-semibold text-text">Boxes</h2>
                    <button
                      type="button"
                      onClick={clearAll}
                      className="text-body-sm text-text-faint underline-offset-4 hover:text-text hover:underline"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {boxItems.map((b) => (
                      <Stepper
                        key={b.key}
                        label={b.label}
                        sublabel={`${b.volume_cuft} cu ft`}
                        qty={qty[b.key] ?? 0}
                        onChange={(n) => setKey(b.key, n)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Named items */}
              <section className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-h5 font-semibold text-text">Furniture &amp; items</h2>
                  <span className="text-caption text-text-faint tabular">
                    {activeItems.length} selected
                  </span>
                </div>
                <Input
                  label="Search items"
                  hideLabel
                  placeholder="Search items (sofa, mattress…)"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  prefix={<Search size={16} aria-hidden="true" />}
                />
                <div className="flex max-h-[22rem] flex-col gap-2 overflow-y-auto pr-1">
                  {filteredNamed.length === 0 ? (
                    <p className="px-1 py-6 text-center text-body-sm text-text-faint">
                      No items match “{filter}”.
                    </p>
                  ) : (
                    filteredNamed.map((it: CatalogItem) => (
                      <Stepper
                        key={it.key}
                        label={it.label}
                        sublabel={`${it.volume_cuft} cu ft`}
                        qty={qty[it.key] ?? 0}
                        onChange={(n) => setKey(it.key, n)}
                      />
                    ))
                  )}
                </div>
              </section>

              {/* Packaging affiliate CTA (Section 6) */}
              <aside className="flex items-center justify-between gap-3 rounded-md border border-[color:var(--border)] bg-surface-sunk px-4 py-3">
                <div className="flex items-center gap-2 text-body-sm text-text-muted">
                  <Package size={18} aria-hidden="true" className="text-text-faint" />
                  Need boxes and tape?
                </div>
                <a
                  href={api.affiliate.goHref('packaging', 'volume')}
                  className="inline-flex items-center gap-1 text-body-sm font-semibold text-accent-ink underline-offset-4 hover:underline dark:text-accent"
                >
                  Packing supplies
                  <ArrowRight size={14} aria-hidden="true" />
                </a>
              </aside>
            </div>
          )}
        </Card>

        {/* ---------------- READOUT (right) ---------------- */}
        <Card padding="lg" className="rounded-xl lg:sticky lg:top-20 lg:self-start">
          <div className="flex flex-col items-center gap-6">
            <div className="w-full">
              {hasItems ? (
                <FacetedBox fill={fillFraction} />
              ) : (
                <div className="flex flex-col items-center gap-4 py-2 text-center">
                  <div className="opacity-70">
                    <FacetedBox fill={0} />
                  </div>
                  <div className="flex flex-col items-center gap-3">
                    <p className="flex items-center gap-2 text-body text-text-muted">
                      <Boxes size={18} aria-hidden="true" className="text-text-faint" />
                      Add your first item or load a sample.
                    </p>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={loadSample}
                      disabled={!catalog?.bedroom_presets?.two}
                    >
                      Load a 2-bedroom sample
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Readouts */}
            <div className="grid w-full grid-cols-2 gap-3">
              <StatTile
                label="Total volume"
                value={result?.total_cuft ?? null}
                loading={calcLoading && !result}
                unit="cu ft"
                size="lg"
                emptyNote={hasItems ? undefined : 'Add items to calculate'}
              />
              <StatTile
                label="Metric (CBM)"
                value={result?.total_cbm ?? null}
                loading={calcLoading && !result}
                format={(n) => n.toFixed(2)}
                unit="m³"
                size="lg"
              />
            </div>

            {calcError && (
              <p className="flex w-full items-center gap-2 rounded-md border border-[color:var(--danger)]/35 bg-[color:var(--danger)]/10 px-3 py-2 text-body-sm text-[color:var(--danger)]">
                <AlertTriangle size={16} aria-hidden="true" />
                {calcError}
              </p>
            )}

            {/* Line-item breakdown */}
            {result && result.line_items.length > 0 && (
              <div className="w-full">
                <h3 className="mb-2 text-caption font-semibold uppercase tracking-[0.08em] text-text-faint">
                  Breakdown
                </h3>
                <ul className="flex flex-col divide-y divide-[color:var(--border)]">
                  {result.line_items.map((li) => (
                    <li key={li.key} className="flex items-center justify-between gap-3 py-1.5 text-body-sm">
                      <span className="text-text-muted">
                        {li.label} <span className="text-text-faint">× {li.quantity}</span>
                      </span>
                      <span className="tabular font-medium text-text">
                        {li.subtotal_cuft.toLocaleString('en-US')} cu ft
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Save (appears once a result exists) */}
            {result && (
              <div className="w-full border-t border-[color:var(--border)] pt-4">
                {saved ? (
                  <Badge tone="success" icon={<Check aria-hidden="true" />}>
                    Inventory saved · {saved.total_cuft.toLocaleString('en-US')} cu ft
                  </Badge>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Button variant="secondary" block loading={saving} onClick={handleSave}>
                      <Save size={16} aria-hidden="true" />
                      Save this inventory
                    </Button>
                    {saveError && (
                      <p className="text-body-sm text-[color:var(--danger)]">{saveError}</p>
                    )}
                    <p className="text-caption text-text-faint">
                      Saved to an anonymous session — no email required.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Mobile sticky action bar */}
      {hasItems && (
        <div
          className="fixed inset-x-0 bottom-0 z-40 border-t border-[color:var(--border)] bg-surface/95 px-4 py-3 backdrop-blur md:hidden"
          style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-caption text-text-faint">Total volume</p>
              <p className="tabular text-h5 font-semibold text-text">
                {result ? `${result.total_cuft.toLocaleString('en-US')} cu ft` : calcLoading ? '…' : '—'}
              </p>
            </div>
            <Button variant="secondary" size="sm" loading={saving} disabled={!result} onClick={handleSave}>
              <Save size={16} aria-hidden="true" />
              Save
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
