import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Boxes,
  CalendarClock,
  Pencil,
  Trash2,
  ArrowRight,
  AlertTriangle,
  Check,
  X,
  PackageOpen,
  ListChecks,
  LogIn,
} from 'lucide-react';
import {
  api,
  ApiError,
  getAuthToken,
  type InventorySummary,
  type Timeline,
} from '@/lib/api';
import { Button, Card, Input, Eyebrow, Badge, Skeleton, StatTile } from '@/components/ui';

/**
 * /dashboard — the registered "Ivory" app home (§3.10). Active-move summary +
 * saved inventory list (GET /api/inventory/list) + timeline progress. Every figure
 * is fetched; inventory rows support edit (PUT) and delete (DELETE). No number is
 * fabricated — 401 renders a sign-in gate, failures render inline banners.
 */

const TIMELINE_KEY = 'mp-timeline-id';

function errMsg(e: unknown): string {
  return e instanceof ApiError ? e.message : 'Something went wrong — please try again.';
}
function isUnauth(e: unknown): boolean {
  return e instanceof ApiError && (e.status === 401 || e.code === 'UNAUTHENTICATED');
}
function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function SignInGate() {
  return (
    <div className="container-mp py-16 md:py-24">
      <Card padding="lg" className="mx-auto flex max-w-lg flex-col items-center gap-4 text-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent/12 text-accent-ink dark:text-accent">
          <LogIn size={22} aria-hidden="true" />
        </span>
        <h1 className="font-display text-h3 font-medium text-text">Sign in to see your move</h1>
        <p className="max-w-prose text-body text-text-muted">
          Your saved inventory, timeline, and Vault live behind a free account. No spam, ever — we
          never sell your data.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button to="/login" variant="secondary">
            Sign in
          </Button>
          <Button to="/join">
            Save your work — free
            <ArrowRight size={16} aria-hidden="true" />
          </Button>
        </div>
      </Card>
    </div>
  );
}

function InventoryRow({
  row,
  onDeleted,
  onRenamed,
}: {
  row: InventorySummary;
  onDeleted: (id: string) => void;
  onRenamed: (id: string, name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(row.name);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    const next = name.trim();
    if (!next) {
      setError('Name cannot be empty.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.inventory.update(row.id, { name: next });
      onRenamed(row.id, next);
      setEditing(false);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.inventory.remove(row.id);
      onDeleted(row.id);
    } catch (e) {
      setError(errMsg(e));
      setBusy(false);
      setConfirming(false);
    }
  };

  return (
    <Card as="li" padding="md" className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="flex items-center gap-2">
              <Input
                label="Inventory name"
                hideLabel
                value={name}
                onChange={(e) => setName(e.target.value)}
                containerClassName="flex-1"
                autoFocus
              />
              <Button size="sm" loading={busy} onClick={save} aria-label="Save name">
                <Check size={16} aria-hidden="true" />
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setName(row.name);
                  setEditing(false);
                  setError(null);
                }}
                aria-label="Cancel rename"
              >
                <X size={16} aria-hidden="true" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <PackageOpen size={18} aria-hidden="true" className="shrink-0 text-text-faint" />
              <p className="truncate text-h5 font-semibold text-text">{row.name}</p>
            </div>
          )}
          <p className="mt-1 text-caption text-text-faint tabular">
            Updated {fmtDate(row.updated_at)}
          </p>
        </div>
        {!editing && (
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => setEditing(true)}
              aria-label={`Rename ${row.name}`}
              className="inline-flex h-9 w-9 items-center justify-center rounded-sm border border-[color:var(--border-strong)] text-text-muted transition-colors hover:bg-surface-sunk"
            >
              <Pencil size={15} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setConfirming(true)}
              aria-label={`Delete ${row.name}`}
              className="inline-flex h-9 w-9 items-center justify-center rounded-sm border border-[color:var(--border-strong)] text-[color:var(--danger)] transition-colors hover:bg-[color:var(--danger)]/10"
            >
              <Trash2 size={15} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-t border-[color:var(--border)] pt-3 text-body-sm">
        <span className="tabular text-text">
          <span className="font-semibold">{row.total_cuft.toLocaleString('en-US')}</span>{' '}
          <span className="text-text-muted">cu ft</span>
        </span>
        <span className="tabular text-text-muted">{row.total_cbm.toFixed(2)} m³</span>
        <Link
          to="/tools/volume"
          className="ml-auto inline-flex items-center gap-1 text-body-sm font-semibold text-accent-ink underline-offset-4 hover:underline dark:text-accent"
        >
          Open in calculator
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>

      {confirming && (
        <div className="flex flex-col gap-2 rounded-md border border-[color:var(--danger)]/35 bg-[color:var(--danger)]/10 p-3">
          <p className="text-body-sm text-text">
            Delete “{row.name}”? This can&apos;t be undone.
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setConfirming(false)}>
              Keep it
            </Button>
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[color:var(--danger)] px-4 text-body-sm font-medium text-white disabled:opacity-60"
            >
              <Trash2 size={15} aria-hidden="true" />
              Delete
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="flex items-center gap-1.5 text-body-sm text-[color:var(--danger)]">
          <AlertTriangle size={15} aria-hidden="true" />
          {error}
        </p>
      )}
    </Card>
  );
}

export function Dashboard() {
  const signedIn = Boolean(getAuthToken());

  const [inv, setInv] = useState<InventorySummary[] | null>(null);
  const [invLoading, setInvLoading] = useState(true);
  const [invError, setInvError] = useState<string | null>(null);
  const [unauth, setUnauth] = useState(false);
  const [reload, setReload] = useState(0);

  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);

  // Saved inventory
  useEffect(() => {
    if (!signedIn) return;
    const ctrl = new AbortController();
    setInvLoading(true);
    setInvError(null);
    api.inventory
      .list()
      .then((d) => setInv(d.items))
      .catch((e) => {
        if (ctrl.signal.aborted) return;
        if (isUnauth(e)) setUnauth(true);
        else setInvError(errMsg(e));
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setInvLoading(false);
      });
    return () => ctrl.abort();
  }, [signedIn, reload]);

  // Timeline progress — fetch the last-generated timeline if one is known locally.
  useEffect(() => {
    if (!signedIn) return;
    let id: string | null = null;
    try {
      id = localStorage.getItem(TIMELINE_KEY);
    } catch {
      id = null;
    }
    if (!id) return;
    const ctrl = new AbortController();
    setTimelineLoading(true);
    api.timeline
      .get(id)
      .then((t) => setTimeline(t))
      .catch(() => {
        /* stale/removed id — leave the empty prompt, never fabricate progress */
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setTimelineLoading(false);
      });
    return () => ctrl.abort();
  }, [signedIn, reload]);

  const onDeleted = useCallback((id: string) => {
    setInv((prev) => (prev ? prev.filter((r) => r.id !== id) : prev));
  }, []);
  const onRenamed = useCallback((id: string, name: string) => {
    setInv((prev) => (prev ? prev.map((r) => (r.id === id ? { ...r, name } : r)) : prev));
  }, []);

  const active = useMemo(() => {
    if (!inv || inv.length === 0) return null;
    return [...inv].sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    )[0];
  }, [inv]);

  const doneCount = timeline ? timeline.tasks.filter((t) => t.done).length : 0;
  const taskTotal = timeline ? timeline.tasks.length : 0;
  const pct = taskTotal > 0 ? Math.round((doneCount / taskTotal) * 100) : 0;

  if (!signedIn || unauth) return <SignInGate />;

  return (
    <div className="container-mp py-12 md:py-20">
      <header className="flex flex-col gap-3">
        <Eyebrow>Your move</Eyebrow>
        <h1 className="font-display text-h2 font-medium text-text">Dashboard</h1>
        <p className="max-w-prose text-body-lg text-text-muted">
          Everything you&apos;ve saved, in one place. Pick up where you left off — nothing here is
          ever shared or sold.
        </p>
      </header>

      {/* Active-move summary */}
      <section aria-labelledby="active-move" className="mt-10">
        <h2 id="active-move" className="sr-only">
          Active move summary
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatTile
            label="Saved inventories"
            value={inv ? inv.length : null}
            loading={invLoading && !inv}
            emptyNote={inv && inv.length === 0 ? 'None yet' : undefined}
          />
          <StatTile
            label="Active load"
            value={active ? active.total_cuft : null}
            loading={invLoading && !inv}
            unit="cu ft"
            sublabel={active ? active.name : undefined}
            emptyNote={inv && inv.length === 0 ? 'Save an inventory' : undefined}
          />
          <StatTile
            label="Timeline progress"
            value={timeline ? pct : null}
            loading={timelineLoading && !timeline}
            unit="%"
            sublabel={timeline ? `${doneCount} of ${taskTotal} tasks done` : undefined}
            emptyNote={!timeline && !timelineLoading ? 'No timeline yet' : undefined}
          />
        </div>
      </section>

      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Saved inventory */}
        <section aria-labelledby="inv-heading" className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <h2 id="inv-heading" className="flex items-center gap-2 text-h4 font-semibold text-text">
              <Boxes size={20} aria-hidden="true" className="text-accent-ink dark:text-accent" />
              Saved inventory
            </h2>
            <Button to="/tools/volume" variant="secondary" size="sm">
              New inventory
            </Button>
          </div>

          {invLoading && !inv ? (
            <ul aria-busy="true" className="flex flex-col gap-3">
              <span className="sr-only">Loading your saved inventory…</span>
              {Array.from({ length: 3 }).map((_, i) => (
                <li key={i}>
                  <Skeleton className="h-28 w-full rounded-lg" />
                </li>
              ))}
            </ul>
          ) : invError ? (
            <Card padding="md" className="flex flex-col items-start gap-3 border-[color:var(--danger)]/35">
              <p className="flex items-center gap-2 text-body-sm text-[color:var(--danger)]">
                <AlertTriangle size={16} aria-hidden="true" />
                Couldn&apos;t load your inventory. {invError}
              </p>
              <Button size="sm" variant="secondary" onClick={() => setReload((n) => n + 1)}>
                Retry
              </Button>
            </Card>
          ) : inv && inv.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {inv.map((row) => (
                <InventoryRow key={row.id} row={row} onDeleted={onDeleted} onRenamed={onRenamed} />
              ))}
            </ul>
          ) : (
            <Card padding="lg" className="flex flex-col items-center gap-3 text-center">
              <PackageOpen size={28} aria-hidden="true" className="text-text-faint" />
              <p className="text-body text-text-muted">
                No saved inventory yet. Build one in the volume calculator and save it here.
              </p>
              <Button to="/tools/volume">
                Calculate your volume
                <ArrowRight size={16} aria-hidden="true" />
              </Button>
            </Card>
          )}
        </section>

        {/* Timeline progress */}
        <section aria-labelledby="tl-heading" className="flex flex-col gap-4">
          <h2 id="tl-heading" className="flex items-center gap-2 text-h4 font-semibold text-text">
            <CalendarClock size={20} aria-hidden="true" className="text-accent-ink dark:text-accent" />
            Move timeline
          </h2>
          <Card padding="lg" className="flex flex-col gap-4">
            {timelineLoading && !timeline ? (
              <div aria-busy="true" className="flex flex-col gap-3">
                <span className="sr-only">Loading your timeline…</span>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-6 w-full" />
              </div>
            ) : timeline ? (
              <>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-body-sm text-text-muted">
                    Move date{' '}
                    <span className="tabular font-semibold text-text">
                      {fmtDate(timeline.move_date)}
                    </span>
                  </p>
                  <span className="tabular text-h5 font-semibold text-text">{pct}%</span>
                </div>
                <div
                  className="h-2.5 w-full overflow-hidden rounded-pill bg-surface-sunk"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={pct}
                  aria-label="Timeline completion"
                >
                  <div
                    className="h-full rounded-pill bg-accent transition-[width] duration-slow ease-out-quart"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="flex items-center gap-2 text-body-sm text-text-muted">
                  <ListChecks size={16} aria-hidden="true" className="text-text-faint" />
                  {doneCount} of {taskTotal} tasks complete
                </p>
                <Button to="/dashboard/timeline" variant="secondary" block>
                  Open full timeline
                  <ArrowRight size={16} aria-hidden="true" />
                </Button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 py-2 text-center">
                <CalendarClock size={26} aria-hidden="true" className="text-text-faint" />
                <p className="text-body text-text-muted">
                  Pick your move date to generate a week-by-week countdown.
                </p>
                <Button to="/dashboard/timeline">
                  Create my timeline
                  <ArrowRight size={16} aria-hidden="true" />
                </Button>
              </div>
            )}
          </Card>

          <Card padding="md" className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-body-sm text-text-muted">
              <Badge tone="copper">Premium</Badge>
              Relocation Vault
            </div>
            <Link
              to="/dashboard/vault"
              className="inline-flex items-center gap-1 text-body-sm font-semibold text-copper underline-offset-4 hover:underline"
            >
              Open
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </Card>
        </section>
      </div>
    </div>
  );
}
