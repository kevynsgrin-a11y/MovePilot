import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import {
  BellRing,
  Check,
  AlertTriangle,
  XCircle,
  Clock,
  Phone,
  Plus,
} from 'lucide-react';
import { api, ApiError, type VaultAlert } from '@/lib/api';
import { Button, Card, Input, Badge, Eyebrow, Skeleton, type BadgeTone } from '@/components/ui';
import {
  SignInGate,
  PremiumGate,
  isUnauth,
  isPremiumRequired,
} from '@/components/vault/VaultGate';

/**
 * /dashboard/alerts (§3.10) — SMS reminder config. GET /api/vault/alerts lists the
 * user's scheduled alerts (status rendered as an icon+label chip, never a bare
 * colored cell); POST /api/vault/alerts schedules a new one. Premium-gated: 402 →
 * preview-with-sample + unlock. Loading skeleton / empty / error states.
 */

type Gate = 'signin' | 'premium' | null;

function errMsg(e: unknown): string {
  return e instanceof ApiError ? e.message : 'Something went wrong — please try again.';
}
function fmtWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const STATUS: Record<VaultAlert['status'], { tone: BadgeTone; icon: ReactNode; label: string }> = {
  scheduled: { tone: 'accent', icon: <BellRing />, label: 'Scheduled' },
  sent: { tone: 'success', icon: <Check />, label: 'Sent' },
  failed: { tone: 'danger', icon: <AlertTriangle />, label: 'Failed' },
  cancelled: { tone: 'neutral', icon: <XCircle />, label: 'Cancelled' },
};

function AlertList({ alerts }: { alerts: VaultAlert[] }) {
  return (
    <ul className="flex flex-col divide-y divide-[color:var(--border)]">
      {alerts.map((a) => {
        const s = STATUS[a.status] ?? STATUS.scheduled;
        return (
          <li key={a.id} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="truncate text-body font-medium text-text">{a.task_title}</p>
              <p className="flex items-center gap-1.5 text-caption text-text-faint tabular">
                <Clock size={13} aria-hidden="true" />
                {fmtWhen(a.send_at)}
              </p>
            </div>
            <Badge tone={s.tone} icon={s.icon}>
              {s.label}
            </Badge>
          </li>
        );
      })}
    </ul>
  );
}

// Sample — rendered ONLY inside PremiumGate (labelled "Sample data").
const SAMPLE_ALERTS: VaultAlert[] = [
  {
    id: 'a1',
    task_title: 'Confirm mover & deposit',
    send_at: '2026-08-01T15:00:00Z',
    status: 'scheduled',
    created_at: '2026-07-19T12:00:00Z',
  },
  {
    id: 'a2',
    task_title: 'Transfer utilities',
    send_at: '2026-07-10T14:00:00Z',
    status: 'sent',
    created_at: '2026-07-01T12:00:00Z',
  },
];

export function Alerts() {
  const [alerts, setAlerts] = useState<VaultAlert[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gate, setGate] = useState<Gate>(null);
  const [reload, setReload] = useState(0);

  const [title, setTitle] = useState('');
  const [phone, setPhone] = useState('');
  const [sendAt, setSendAt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    setGate(null);
    api.vault
      .listAlerts()
      .then((d) => setAlerts(d.alerts))
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
    if (!title.trim()) return setFormError('Enter what the reminder is for.');
    if (!phone.trim()) return setFormError('Enter a phone number for the SMS.');
    if (!sendAt) return setFormError('Pick when to send the reminder.');
    const when = new Date(sendAt);
    if (Number.isNaN(when.getTime())) return setFormError('That send time isn’t valid.');
    if (when.getTime() <= Date.now()) return setFormError('Pick a time in the future.');

    setSubmitting(true);
    setFormError(null);
    try {
      const created = await api.vault.createAlert({
        task_title: title.trim(),
        phone: phone.trim(),
        send_at: when.toISOString(),
      });
      // Reflect the new alert immediately from the real response.
      setAlerts((prev) => [
        {
          id: created.alert_id,
          task_title: title.trim(),
          send_at: when.toISOString(),
          status: created.status,
          created_at: new Date().toISOString(),
        },
        ...(prev ?? []),
      ]);
      setTitle('');
      setPhone('');
      setSendAt('');
    } catch (err) {
      if (isPremiumRequired(err)) setGate('premium');
      else setFormError(errMsg(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (gate === 'signin') return <SignInGate feature="SMS reminders" />;
  if (gate === 'premium')
    return (
      <PremiumGate
        title="A text before every deadline that matters."
        description="Schedule an SMS for any move task — confirm the mover, transfer utilities, return keys. We send it once, at the time you set. No app, no daily nagging."
        onUnlocked={() => setReload((n) => n + 1)}
        sample={<AlertList alerts={SAMPLE_ALERTS} />}
      />
    );

  return (
    <div className="container-mp py-12 md:py-20">
      <header className="flex flex-col gap-3">
        <Eyebrow className="!text-copper">Relocation Vault</Eyebrow>
        <h1 className="flex items-center gap-2.5 font-display text-h2 font-medium text-text">
          <BellRing size={28} aria-hidden="true" className="text-copper" />
          SMS reminders
        </h1>
        <p className="max-w-prose text-body-lg text-text-muted">
          Schedule a one-time text for any deadline in your move. We send it exactly when you ask —
          and never share your number.
        </p>
      </header>

      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.3fr]">
        {/* Schedule form */}
        <Card padding="lg" className="rounded-xl lg:sticky lg:top-20 lg:self-start">
          <form className="flex flex-col gap-4" onSubmit={submit}>
            <h2 className="text-h5 font-semibold text-text">Schedule a reminder</h2>
            <Input
              label="Reminder"
              placeholder="e.g. Confirm mover & deposit"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <Input
              label="Phone number"
              type="tel"
              inputMode="tel"
              placeholder="+1 555 123 4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              prefix={<Phone size={16} aria-hidden="true" />}
              required
            />
            <label className="flex flex-col gap-1.5">
              <span className="text-body-sm font-medium text-text">Send at</span>
              <input
                type="datetime-local"
                value={sendAt}
                onChange={(e) => setSendAt(e.target.value)}
                className="rounded-sm border-[1.5px] border-[color:var(--border-strong)] bg-surface px-3 py-2.5 text-body text-text outline-none focus:border-[color:var(--accent)]"
              />
            </label>
            <Button type="submit" block loading={submitting}>
              <Plus size={16} aria-hidden="true" />
              Schedule reminder
            </Button>
            {formError && (
              <p className="flex items-center gap-1.5 text-body-sm text-[color:var(--danger)]">
                <AlertTriangle size={15} aria-hidden="true" />
                {formError}
              </p>
            )}
            <p className="text-caption text-text-faint">
              One text, at the time you choose. We never sell or reuse your number.
            </p>
          </form>
        </Card>

        {/* Scheduled list */}
        <Card padding="lg" className="rounded-xl">
          <h2 className="mb-4 text-h5 font-semibold text-text">Your reminders</h2>
          {loading && !alerts ? (
            <div aria-busy="true" className="flex flex-col gap-3">
              <span className="sr-only">Loading your reminders…</span>
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-start gap-3">
              <p className="flex items-center gap-2 text-body-sm text-[color:var(--danger)]">
                <AlertTriangle size={16} aria-hidden="true" />
                Couldn&apos;t load your reminders. {error}
              </p>
              <Button size="sm" variant="secondary" onClick={() => setReload((n) => n + 1)}>
                Retry
              </Button>
            </div>
          ) : alerts && alerts.length > 0 ? (
            <AlertList alerts={alerts} />
          ) : (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <BellRing size={28} aria-hidden="true" className="text-text-faint" />
              <p className="text-body text-text-muted">No reminders scheduled yet.</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
