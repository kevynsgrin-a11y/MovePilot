import { useState, type ReactNode } from 'react';
import { Lock, ShieldCheck, LogIn, ArrowRight, AlertTriangle } from 'lucide-react';
import { api, ApiError, getAuthToken, setPremium } from '@/lib/api';
import { Button, Card, Badge, Eyebrow } from '@/components/ui';

/**
 * Shared premium/auth gate states for the Vault routes (§3.10). A 401 renders the
 * sign-in gate; a 402 PREMIUM_REQUIRED renders the feature preview-with-sample-data
 * plus a SINGLE copper unlock button (POST /api/premium/purchase when signed in, or
 * route to save-your-work first). Never a hard wall, never fabricated real data.
 */

const UNLOCK_AMOUNT = 19.99;

export function isUnauth(e: unknown): boolean {
  return e instanceof ApiError && (e.status === 401 || e.code === 'UNAUTHENTICATED');
}
export function isPremiumRequired(e: unknown): boolean {
  return e instanceof ApiError && (e.status === 402 || e.code === 'PREMIUM_REQUIRED');
}

export function SignInGate({ feature }: { feature: string }) {
  return (
    <div className="container-mp py-16 md:py-24">
      <Card padding="lg" className="mx-auto flex max-w-lg flex-col items-center gap-4 text-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent/12 text-accent-ink dark:text-accent">
          <LogIn size={22} aria-hidden="true" />
        </span>
        <h1 className="font-display text-h3 font-medium text-text">Sign in to open the Vault</h1>
        <p className="max-w-prose text-body text-text-muted">
          {feature} lives behind a free account. No spam, ever — we never sell your data.
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

/**
 * PremiumGate — the 402 preview. Renders the caller's `sample` block (labelled
 * "Sample"), then a single copper unlock. When signed in, the unlock performs the
 * real POST /api/premium/purchase and calls `onUnlocked` on success; otherwise it
 * routes to /join.
 */
export function PremiumGate({
  title,
  description,
  sample,
  onUnlocked,
}: {
  title: string;
  description: string;
  sample: ReactNode;
  onUnlocked: () => void;
}) {
  const signedIn = Boolean(getAuthToken());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unlock = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.premium.purchase(UNLOCK_AMOUNT);
      setPremium(true);
      onUnlocked();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Unlock failed — please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container-mp py-12 md:py-20">
      <header className="mx-auto flex max-w-2xl flex-col items-center gap-3 text-center">
        <Eyebrow className="!text-copper">Relocation Vault · Premium</Eyebrow>
        <h1 className="font-display text-h2 font-medium text-text">{title}</h1>
        <p className="max-w-prose text-body-lg text-text-muted">{description}</p>
      </header>

      <Card
        variant="copper"
        padding="lg"
        className="relative mx-auto mt-10 max-w-3xl overflow-hidden border-copper/60"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-body-sm font-semibold text-copper">
            <ShieldCheck size={18} aria-hidden="true" />
            Preview
          </div>
          <Badge tone="copper" icon={<Lock />}>
            Sample data
          </Badge>
        </div>

        <div className="pointer-events-none select-none opacity-95">{sample}</div>

        <div className="mt-8 flex flex-col items-center gap-2 border-t border-copper/30 pt-6">
          {signedIn ? (
            <Button variant="copper" loading={busy} onClick={unlock}>
              <Lock size={16} aria-hidden="true" />
              Unlock the Project Pass
            </Button>
          ) : (
            <Button variant="copper" to="/join">
              Save your work, then unlock
              <ArrowRight size={16} aria-hidden="true" />
            </Button>
          )}
          <span className="text-body-sm font-semibold text-copper">
            $19.99–$29.99 one-time — no subscription
          </span>
          {error && (
            <p className="flex items-center gap-1.5 text-body-sm text-[color:var(--danger)]">
              <AlertTriangle size={15} aria-hidden="true" />
              {error}
            </p>
          )}
          <Button variant="link" to="/pricing" className="text-copper">
            See everything the Pass unlocks
          </Button>
        </div>
      </Card>
    </div>
  );
}
