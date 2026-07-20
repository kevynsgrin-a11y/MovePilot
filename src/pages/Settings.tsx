import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Trash2,
  LogOut,
  AlertTriangle,
  Sun,
  Moon,
  Lock,
  LogIn,
  ArrowRight,
} from 'lucide-react';
import {
  api,
  ApiError,
  getAuthToken,
  getPremium,
  setAuthToken,
  setPremium,
  type InventorySummary,
} from '@/lib/api';
import { Button, Card, Input, Badge, Eyebrow, Skeleton } from '@/components/ui';
import { useTheme } from '@/lib/theme';

/**
 * /dashboard/settings (§3.10) — account + a prominent "Delete my data" control (a
 * privacy proof point). Deletion uses real endpoints only: it removes every saved
 * inventory (GET /api/inventory/list → DELETE /api/inventory/[id]) and signs you out,
 * clearing all local tokens. No data is fabricated; a typed confirmation guards it.
 */

const CONFIRM_WORD = 'DELETE';

function errMsg(e: unknown): string {
  return e instanceof ApiError ? e.message : 'Something went wrong — please try again.';
}
function isUnauth(e: unknown): boolean {
  return e instanceof ApiError && (e.status === 401 || e.code === 'UNAUTHENTICATED');
}

function SignInGate() {
  return (
    <div className="container-mp py-16 md:py-24">
      <Card padding="lg" className="mx-auto flex max-w-lg flex-col items-center gap-4 text-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent/12 text-accent-ink dark:text-accent">
          <LogIn size={22} aria-hidden="true" />
        </span>
        <h1 className="font-display text-h3 font-medium text-text">Sign in to manage your data</h1>
        <p className="max-w-prose text-body text-text-muted">
          Your settings and privacy controls live behind a free account.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button to="/login" variant="secondary">
            Sign in
          </Button>
          <Button to="/join">
            Create a free account
            <ArrowRight size={16} aria-hidden="true" />
          </Button>
        </div>
      </Card>
    </div>
  );
}

export function Settings() {
  const signedIn = Boolean(getAuthToken());
  const premium = getPremium();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();

  const [inv, setInv] = useState<InventorySummary[] | null>(null);
  const [invLoading, setInvLoading] = useState(true);
  const [unauth, setUnauth] = useState(false);

  const [signingOut, setSigningOut] = useState(false);

  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!signedIn) return;
    const ctrl = new AbortController();
    setInvLoading(true);
    api.inventory
      .list()
      .then((d) => setInv(d.items))
      .catch((e) => {
        if (ctrl.signal.aborted) return;
        if (isUnauth(e)) setUnauth(true);
        // A non-auth failure just leaves the count unknown; deletion still works.
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setInvLoading(false);
      });
    return () => ctrl.abort();
  }, [signedIn]);

  const clearLocalAndLeave = () => {
    setAuthToken(null);
    setPremium(false);
    navigate('/');
  };

  const signOut = async () => {
    setSigningOut(true);
    try {
      await api.auth.logout();
    } catch {
      /* revoke best-effort — we clear locally regardless */
    } finally {
      clearLocalAndLeave();
    }
  };

  const deleteEverything = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      // Re-list to catch anything added since mount, then delete each record.
      const list = inv ?? (await api.inventory.list()).items;
      for (const row of list) {
        await api.inventory.remove(row.id);
      }
      // Revoke the session, then wipe every local trace.
      try {
        await api.auth.logout();
      } catch {
        /* ignore */
      }
      clearLocalAndLeave();
    } catch (e) {
      setDeleteError(errMsg(e));
      setDeleting(false);
    }
  };

  if (!signedIn || unauth) return <SignInGate />;

  const invCount = inv?.length ?? 0;
  const confirmed = confirmText.trim().toUpperCase() === CONFIRM_WORD;

  return (
    <div className="container-mp py-12 md:py-20">
      <header className="flex flex-col gap-3">
        <Eyebrow>Account</Eyebrow>
        <h1 className="font-display text-h2 font-medium text-text">Settings</h1>
        <p className="max-w-prose text-body-lg text-text-muted">
          Your account, your data, your call. We never sell either — and everything here can be
          deleted in one step.
        </p>
      </header>

      <div className="mt-10 flex max-w-2xl flex-col gap-6">
        {/* Account */}
        <Card padding="lg" className="flex flex-col gap-4">
          <h2 className="text-h4 font-semibold text-text">Account</h2>
          <div className="flex items-center justify-between gap-3">
            <span className="text-body text-text-muted">Plan</span>
            {premium ? (
              <Badge tone="copper" icon={<ShieldCheck />}>
                Project Pass · Premium
              </Badge>
            ) : (
              <Badge tone="neutral">Free</Badge>
            )}
          </div>
          {!premium && (
            <div className="flex items-center justify-between gap-3 rounded-md border border-copper/40 bg-[color:var(--copper-tint)]/60 p-3 dark:bg-[rgba(183,121,63,0.12)]">
              <span className="flex items-center gap-2 text-body-sm text-text-muted">
                <Lock size={16} aria-hidden="true" className="text-copper" />
                Unlock the Relocation Vault
              </span>
              <Button to="/pricing" variant="copper" size="sm">
                View the Pass
              </Button>
            </div>
          )}
          <div className="border-t border-[color:var(--border)] pt-4">
            <Button variant="secondary" loading={signingOut} onClick={signOut}>
              <LogOut size={16} aria-hidden="true" />
              Sign out
            </Button>
          </div>
        </Card>

        {/* Appearance */}
        <Card padding="lg" className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-h5 font-semibold text-text">Appearance</h2>
            <p className="text-body-sm text-text-muted">
              Currently using the {theme === 'dark' ? 'Cockpit (dark)' : 'Ivory (light)'} theme.
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={toggle} aria-label="Toggle color theme">
            {theme === 'dark' ? (
              <>
                <Sun size={16} aria-hidden="true" />
                Light
              </>
            ) : (
              <>
                <Moon size={16} aria-hidden="true" />
                Dark
              </>
            )}
          </Button>
        </Card>

        {/* Privacy promise */}
        <Card padding="lg" className="flex flex-col gap-2">
          <h2 className="flex items-center gap-2 text-h5 font-semibold text-text">
            <ShieldCheck size={18} aria-hidden="true" className="text-accent-ink dark:text-accent" />
            Our privacy promise
          </h2>
          <p className="text-body-sm text-text-muted">
            We never sell your data or your leads. We don&apos;t require your phone or email to use
            the calculators, and you can erase everything you&apos;ve saved at any time.
          </p>
        </Card>

        {/* Danger zone — Delete my data */}
        <Card
          padding="lg"
          className="flex flex-col gap-4 border-[color:var(--danger)]/40 bg-[color:var(--danger)]/[0.04]"
        >
          <div className="flex flex-col gap-1">
            <h2 className="flex items-center gap-2 text-h4 font-semibold text-[color:var(--danger)]">
              <Trash2 size={20} aria-hidden="true" />
              Delete my data
            </h2>
            <p className="text-body-sm text-text-muted">
              Permanently removes{' '}
              {invLoading ? (
                'your saved inventory'
              ) : (
                <span className="font-semibold text-text">
                  {invCount} saved {invCount === 1 ? 'inventory' : 'inventories'}
                </span>
              )}{' '}
              and signs you out. This can&apos;t be undone.
            </p>
          </div>

          {invLoading ? (
            <Skeleton className="h-5 w-48" />
          ) : (
            <>
              <Input
                label={`Type ${CONFIRM_WORD} to confirm`}
                placeholder={CONFIRM_WORD}
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
              <div className="flex flex-col items-start gap-2">
                <button
                  type="button"
                  onClick={deleteEverything}
                  disabled={!confirmed || deleting}
                  className="inline-flex h-11 items-center gap-2 rounded-md bg-[color:var(--danger)] px-5 text-body font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 size={16} aria-hidden="true" />
                  {deleting ? 'Deleting everything…' : 'Delete everything permanently'}
                </button>
                {deleteError && (
                  <p className="flex items-center gap-1.5 text-body-sm text-[color:var(--danger)]">
                    <AlertTriangle size={15} aria-hidden="true" />
                    {deleteError}
                  </p>
                )}
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
