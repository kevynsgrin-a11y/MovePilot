import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Boxes,
  CalendarClock,
  Check,
  Home,
  MapPin,
  PackageCheck,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Truck,
  Users,
  Zap,
} from 'lucide-react';
import { Button, Card, Eyebrow, Input, Skeleton } from '@/components/ui';
import { cn } from '@/lib/cn';
import {
  api,
  ApiError,
  getAuthToken,
  type Timeline as TimelineData,
  type TimelineTask,
} from '@/lib/api';

/* ==========================================================================
   /timeline — vertical route-line spine of week nodes generated from a move
   date. POST /api/timeline/generate is auth-gated (§3.4): if there is no
   session token we render the sign-in prompt; a signed-in user picks a date
   and the real dated task list draws down the spine. Every task, date, and
   overdue flag comes from the API — nothing is fabricated. Loading = skeleton
   spine; empty = "pick your move date"; error = quiet inline banner.
   ========================================================================== */

// Category -> monoline icon (categories come verbatim from the backend template).
const CATEGORY_ICON: Record<string, ReactNode> = {
  carrier: <ShieldCheck />,
  inventory: <Boxes />,
  declutter: <Trash2 />,
  address: <MapPin />,
  utilities: <Zap />,
  family: <Users />,
  packing: <PackageCheck />,
  moveweek: <Truck />,
};

function categoryIcon(category: string): ReactNode {
  return CATEGORY_ICON[category] ?? <Home />;
}

function errMsg(e: unknown): string {
  return e instanceof ApiError ? e.message : 'Something went wrong — please try again.';
}

/** "8 WEEKS OUT" / "MOVE WEEK" / "AFTER MOVE" from the signed week offset. */
function weekLabel(offset: number): string {
  if (offset === 0) return 'Move week';
  if (offset < 0) return 'After move';
  return `${offset} ${offset === 1 ? 'week' : 'weeks'} out`;
}

const DATE_FMT = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});
function formatDue(iso: string): string {
  const ms = Date.parse(`${iso}T00:00:00Z`);
  return Number.isNaN(ms) ? iso : DATE_FMT.format(new Date(ms));
}

/** Today as YYYY-MM-DD (local) for the date-input `min`. */
function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Sign-in gate — shown when there is no session token (generate needs Bearer)
// ---------------------------------------------------------------------------

function SignInGate() {
  return (
    <Card padding="lg" className="mx-auto max-w-xl rounded-xl text-center">
      <span
        aria-hidden="true"
        className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent-ink dark:text-accent [&_svg]:h-7 [&_svg]:w-7"
      >
        <CalendarClock />
      </span>
      <h2 className="mt-5 font-display text-h3 font-medium text-text">
        Save your move date to build the countdown
      </h2>
      <p className="mx-auto mt-3 max-w-prose text-body text-text-muted">
        Your week-by-week timeline is generated and stored to your account so it stays in sync across
        devices. Create a free account or sign in — no spam, and we never sell your data.
      </p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <Button to="/join">Save your timeline — free</Button>
        <Button to="/login" variant="secondary">
          Sign in
        </Button>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton spine
// ---------------------------------------------------------------------------

function SpineSkeleton() {
  return (
    <ol
      aria-busy="true"
      className="relative ml-2 space-y-6 border-l-2 border-dashed border-[color:var(--border-strong)] pl-8"
    >
      <span className="sr-only">Generating your timeline…</span>
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={i} className="relative">
          <span
            aria-hidden="true"
            className="absolute -left-[2.6rem] top-1 h-4 w-4 rounded-full border-2 border-[color:var(--border-strong)] bg-[color:var(--bg)]"
          />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-2 h-16 w-full rounded-lg" />
        </li>
      ))}
    </ol>
  );
}

// ---------------------------------------------------------------------------
// A single week node on the spine
// ---------------------------------------------------------------------------

function TaskNode({
  task,
  done,
  isCurrent,
  onToggle,
}: {
  task: TimelineTask;
  done: boolean;
  isCurrent: boolean;
  onToggle: () => void;
}) {
  return (
    <li className="relative">
      {/* Spine node: done = filled teal, current = pulsing glow, future = hollow */}
      <span
        aria-hidden="true"
        className={cn(
          'absolute -left-[2.6rem] top-1.5 flex h-4 w-4 items-center justify-center rounded-full border-2 transition-colors',
          done
            ? 'border-accent bg-accent'
            : isCurrent
              ? 'border-accent bg-[color:var(--bg)] shadow-glow-accent'
              : 'border-[color:var(--border-strong)] bg-[color:var(--bg)]',
        )}
      >
        {isCurrent && !done && (
          <span className="absolute inset-0 -z-10 animate-ping2 rounded-full bg-accent/40" />
        )}
      </span>

      <Card
        padding="md"
        className={cn(
          'rounded-lg transition-colors',
          done && 'border-accent/40 bg-accent/[0.04]',
        )}
      >
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-sunk text-accent-ink dark:text-accent [&_svg]:h-5 [&_svg]:w-5"
          >
            {categoryIcon(task.category)}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <Eyebrow>{weekLabel(task.week_offset)}</Eyebrow>
              <span className="text-caption uppercase tracking-[0.06em] text-text-faint">
                {task.category}
              </span>
              {task.overdue && !done && (
                <span className="inline-flex items-center gap-1 rounded-pill border border-[color:var(--danger)]/35 bg-[color:var(--danger)]/12 px-2 py-0.5 text-caption font-semibold text-[color:var(--danger)]">
                  <AlertTriangle size={12} aria-hidden="true" />
                  Overdue
                </span>
              )}
            </div>
            <p
              className={cn(
                'mt-1 text-body font-medium text-text',
                done && 'text-text-muted line-through',
              )}
            >
              {task.title}
            </p>
            <p className="mt-1 tabular text-body-sm text-text-faint">
              Due <time dateTime={task.due_date}>{formatDue(task.due_date)}</time>
            </p>
          </div>

          {/* Checkbox — fills teal + advances the spine (local progress display) */}
          <button
            type="button"
            role="checkbox"
            aria-checked={done}
            aria-label={`Mark "${task.title}" ${done ? 'not done' : 'done'}`}
            onClick={onToggle}
            className={cn(
              'mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-[1.5px] transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-bright)]',
              done
                ? 'border-accent bg-accent text-[#04241f]'
                : 'border-[color:var(--border-strong)] text-transparent hover:border-accent',
            )}
          >
            <Check size={16} aria-hidden="true" />
          </button>
        </div>
      </Card>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

type Status = 'idle' | 'loading' | 'ready' | 'error';

export function Timeline() {
  const signedIn = Boolean(getAuthToken());

  const [moveDate, setMoveDate] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [data, setData] = useState<TimelineData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [doneKeys, setDoneKeys] = useState<Set<string>>(new Set());

  const min = todayIso();
  const pastDate = moveDate !== '' && moveDate < min;
  const canGenerate = moveDate !== '' && !pastDate && status !== 'loading';

  const generate = () => {
    if (!canGenerate) return;
    setStatus('loading');
    setError(null);
    setData(null);
    setDoneKeys(new Set());
    api.timeline
      .generate({ move_date: moveDate })
      .then((res) => {
        setData(res);
        setStatus('ready');
      })
      .catch((e) => {
        setError(errMsg(e));
        setStatus('error');
      });
  };

  const tasks = data?.tasks ?? [];
  const taskKey = (t: TimelineTask, i: number) => `${i}-${t.category}-${t.week_offset}`;

  const doneCount = doneKeys.size;
  const total = tasks.length;
  // First not-yet-done task is the "current" node on the spine.
  const currentKey = useMemo(() => {
    for (let i = 0; i < tasks.length; i++) {
      const k = taskKey(tasks[i], i);
      if (!doneKeys.has(k)) return k;
    }
    return null;
  }, [tasks, doneKeys]);

  const toggle = (key: string) =>
    setDoneKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div className="container-mp py-12 md:py-20">
      <header className="flex flex-col gap-3">
        <Eyebrow>Your move, on rails</Eyebrow>
        <h1 className="font-display text-h2 font-medium text-text">
          A week-by-week timeline that keeps the whole move on schedule.
        </h1>
        <p className="max-w-prose text-body-lg text-text-muted">
          Pick your move date and MovePilot builds a dated countdown of exactly what to do, when —
          from FMCSA-verifying your carrier to filing your change of address.
        </p>
      </header>

      {!signedIn ? (
        <div className="mt-10">
          <SignInGate />
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[22rem_1fr]">
          {/* ---------------- Date picker (left) ---------------- */}
          <div className="lg:sticky lg:top-20 lg:self-start">
            <Card padding="lg" className="rounded-xl">
              <div className="flex items-center gap-2">
                <Sparkles size={18} aria-hidden="true" className="text-accent-ink dark:text-accent" />
                <h2 className="font-sans text-h5 font-semibold text-text">Set your move date</h2>
              </div>
              <div className="mt-5">
                <Input
                  label="Move date"
                  type="date"
                  min={min}
                  value={moveDate}
                  onChange={(e) => setMoveDate(e.target.value)}
                  error={pastDate ? 'Your move date can’t be in the past.' : undefined}
                  hint={pastDate ? undefined : 'We build your countdown backward from this date.'}
                />
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button onClick={generate} loading={status === 'loading'} disabled={!canGenerate}>
                  <CalendarClock size={18} aria-hidden="true" />
                  Generate timeline
                </Button>
                {data && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setData(null);
                      setStatus('idle');
                      setDoneKeys(new Set());
                    }}
                  >
                    <RotateCcw size={16} aria-hidden="true" />
                    Reset
                  </Button>
                )}
              </div>

              {data && total > 0 && (
                <div className="mt-6 border-t border-[color:var(--border)] pt-5" role="status">
                  <div className="flex items-baseline justify-between">
                    <span className="text-caption font-semibold uppercase tracking-[0.08em] text-text-faint">
                      Progress
                    </span>
                    <span className="tabular text-body-sm font-semibold text-text">
                      {doneCount} / {total} done
                    </span>
                  </div>
                  <div
                    className="mt-2 h-2 w-full overflow-hidden rounded-pill bg-surface-sunk"
                    aria-hidden="true"
                  >
                    <div
                      className="h-full rounded-pill bg-accent transition-[width] duration-base"
                      style={{ width: `${total ? (doneCount / total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* ---------------- Spine (right) ---------------- */}
          <div>
            {status === 'loading' ? (
              <SpineSkeleton />
            ) : status === 'error' ? (
              <div className="flex flex-col items-start gap-3 rounded-lg border border-[color:var(--danger)]/35 bg-[color:var(--danger)]/10 p-5">
                <p className="flex items-center gap-2 text-body-sm font-medium text-[color:var(--danger)]">
                  <AlertTriangle size={18} aria-hidden="true" />
                  {error}
                </p>
                <Button size="sm" variant="secondary" onClick={generate}>
                  Try again
                </Button>
              </div>
            ) : data && total > 0 ? (
              <ol className="relative ml-2 space-y-6 border-l-2 border-dashed border-[color:var(--border-strong)] pl-8">
                {tasks.map((t, i) => {
                  const key = taskKey(t, i);
                  const done = doneKeys.has(key);
                  return (
                    <TaskNode
                      key={key}
                      task={t}
                      done={done}
                      isCurrent={key === currentKey}
                      onToggle={() => toggle(key)}
                    />
                  );
                })}
              </ol>
            ) : (
              // Empty / idle state
              <Card padding="lg" className="rounded-xl">
                <div className="flex flex-col items-center gap-4 py-8 text-center">
                  <span
                    aria-hidden="true"
                    className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-sunk text-text-faint [&_svg]:h-7 [&_svg]:w-7"
                  >
                    <CalendarClock />
                  </span>
                  <p className="max-w-prose text-body text-text-muted">
                    Pick your move date to generate your countdown. We&apos;ll date every task and flag
                    anything already overdue.
                  </p>
                  <Link
                    to="/tools/volume"
                    className="text-body-sm font-semibold text-accent-ink dark:text-accent"
                  >
                    Or size your move first →
                  </Link>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
