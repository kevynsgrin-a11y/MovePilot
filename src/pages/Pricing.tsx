import { type ReactNode } from 'react';
import {
  ArrowRight,
  Boxes,
  Check,
  Lock,
  PackageCheck,
  Radar,
  ShieldCheck,
  BellRing,
} from 'lucide-react';
import { m } from 'framer-motion';
import { Badge, Button, Card, Eyebrow } from '@/components/ui';
import { getAuthToken, getPremium } from '@/lib/api';
import { inViewOnce, revealUp, usePrefersReducedMotion } from '@/lib/motion';

/** Scroll-reveal wrapper (reduced-motion safe; final position => CLS 0). */
function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  const reduced = usePrefersReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <m.div
      className={className}
      variants={revealUp}
      initial="hidden"
      whileInView="visible"
      viewport={inViewOnce}
    >
      {children}
    </m.div>
  );
}

/* ==========================================================================
   Pricing — Free vs Project Pass (Blueprint §3.6). Light ivory, calm. The Pass
   column carries the copper gradient border + copper-tint header band. Locked
   features are shown as previews-with-sample-data + ONE unlock button. Price
   copy is identical to the landing Vault teaser + upsell modal:
   "$19.99–$29.99 one-time — no subscription". No dark patterns.
   Static page: reads local auth/premium state only (no fetch on mount).
   ========================================================================== */

const FREE_FEATURES = [
  'Inventory → cubic volume & CBM calculator',
  'Dimensional-weight & DIY-vs-LTL comparison',
  'Distance, fuel, and cost estimates',
  'FMCSA carrier verification (authorization, insurance, safety)',
  'Week-by-week move timeline',
  'Anonymous use — no email or phone required',
];

const PASS_FEATURES = [
  'Everything in Free',
  'Relocation Vault — quote normalization & anomaly flags',
  'Multi-scenario cost comparison (DIY / container / full-service)',
  'PDF quote drop-in extraction',
  'SMS reminders on timeline tasks',
  'Priority carrier re-checks',
];

interface GatedPreview {
  icon: ReactNode;
  title: string;
  sample: ReactNode;
}

const GATED: GatedPreview[] = [
  {
    icon: <Radar />,
    title: 'Quote anomaly radar',
    sample: (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-body-sm">
          <span className="text-text-muted">Mover A · 5,900 lb · 840 cu ft</span>
          <Badge tone="success" icon={<Check />}>
            In range
          </Badge>
        </div>
        <div className="flex items-center justify-between text-body-sm">
          <span className="text-text-muted">Mover B · 4,100 lb · 840 cu ft</span>
          <Badge tone="warn" icon={<Radar />}>
            Flagged
          </Badge>
        </div>
      </div>
    ),
  },
  {
    icon: <PackageCheck />,
    title: 'Multi-scenario comparison',
    sample: (
      <table className="w-full text-body-sm">
        <caption className="sr-only">Sample scenario totals</caption>
        <tbody className="tabular">
          <tr className="border-b border-[color:var(--border)]">
            <td className="py-1.5 text-text-muted">DIY truck</td>
            <td className="py-1.5 text-right font-medium text-text">$2,180</td>
          </tr>
          <tr className="border-b border-[color:var(--border)]">
            <td className="py-1.5 text-text-muted">Container</td>
            <td className="py-1.5 text-right font-medium text-text">$3,050</td>
          </tr>
          <tr>
            <td className="py-1.5 font-semibold text-text">Full-service</td>
            <td className="py-1.5 text-right font-semibold text-text">$4,420</td>
          </tr>
        </tbody>
      </table>
    ),
  },
  {
    icon: <BellRing />,
    title: 'SMS timeline reminders',
    sample: (
      <div className="space-y-2 text-body-sm text-text-muted">
        <div className="flex items-center justify-between">
          <span>Confirm mover</span>
          <Badge tone="accent" icon={<BellRing />}>
            Scheduled
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <span>Transfer utilities</span>
          <Badge tone="neutral">Sends in 12 days</Badge>
        </div>
      </div>
    ),
  },
];

export function Pricing() {
  const signedIn = Boolean(getAuthToken());
  const premium = getPremium();

  // Unlock routes to purchase; the actual POST /api/premium/purchase happens on the
  // signed-in purchase flow. Anonymous users are sent to save-your-work first.
  const unlockTo = premium ? '/dashboard/vault' : signedIn ? '/dashboard/vault' : '/join';
  const unlockLabel = premium ? 'Open the Vault' : 'Unlock the Project Pass';

  return (
    <div className="relative">
      <section className="container-mp py-16 md:py-24">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow>Pricing</Eyebrow>
          <h1 className="mt-3 font-display text-h1 font-medium text-text">
            Free forever. Premium only when you want it.
          </h1>
          <p className="mt-4 text-body-lg text-text-muted">
            The calculators, carrier checks, and timeline are always free and always anonymous. The
            Relocation Vault is a one-time pass — never a subscription.
          </p>
        </Reveal>

        {/* Free vs Project Pass */}
        <div className="mx-auto mt-14 grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-2">
          <Reveal>
            <Card padding="lg" className="flex h-full flex-col">
              <Eyebrow tone="muted">Free</Eyebrow>
              <p className="mt-3 flex items-baseline gap-1">
                <span className="font-display text-h1 font-medium text-text">$0</span>
                <span className="text-body text-text-muted">/ always</span>
              </p>
              <p className="mt-2 text-body text-text-muted">
                Everything you need to plan a move on real math.
              </p>
              <ul className="mt-6 flex-1 space-y-3">
                {FREE_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-body text-text">
                    <Check
                      size={18}
                      aria-hidden="true"
                      className="mt-0.5 shrink-0 text-accent-ink dark:text-accent"
                    />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Button to="/tools" variant="secondary" block>
                  Start a move — free
                </Button>
              </div>
            </Card>
          </Reveal>

          <Reveal>
            <Card
              variant="copper"
              padding="none"
              className="flex h-full flex-col overflow-hidden rounded-lg border-copper/60"
            >
              <div className="bg-[color:var(--copper-tint)] px-8 pb-5 pt-6 dark:bg-[rgba(183,121,63,0.14)]">
                <div className="flex items-center justify-between gap-3">
                  <Eyebrow className="!text-copper">Project Pass</Eyebrow>
                  <Badge tone="copper" icon={<ShieldCheck />}>
                    Premium
                  </Badge>
                </div>
                <p className="mt-3 font-display text-h1 font-medium text-text">
                  $19.99–$29.99
                </p>
                <p className="text-body font-semibold text-copper">
                  one-time — no subscription
                </p>
              </div>
              <div className="flex flex-1 flex-col px-8 pb-8 pt-6">
                <p className="text-body text-text-muted">
                  Unlock the Relocation Vault for your move. Pay once, keep it for the whole project.
                </p>
                <ul className="mt-6 flex-1 space-y-3">
                  {PASS_FEATURES.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-body text-text">
                      <Check size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-copper" />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-8">
                  <Button to={unlockTo} variant="copper" block>
                    {unlockLabel}
                    <ArrowRight size={16} aria-hidden="true" />
                  </Button>
                  {!premium && (
                    <p className="mt-3 text-center text-caption text-text-faint">
                      {signedIn
                        ? 'One-time payment. Cancel anytime — there is nothing to cancel.'
                        : 'Save your work first, then unlock — inventory migrates with zero loss.'}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          </Reveal>
        </div>

        {/* Gated-feature previews with sample data */}
        <div className="mx-auto mt-20 max-w-4xl">
          <Reveal className="mb-8 text-center">
            <Eyebrow className="!text-copper">Inside the Vault</Eyebrow>
            <h2 className="mt-3 font-display text-h3 font-medium text-text">
              A preview of what the Pass unlocks.
            </h2>
            <p className="mx-auto mt-3 max-w-prose text-body text-text-muted">
              Sample data shown for layout — your real quotes and scenarios populate once unlocked.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {GATED.map((g) => (
              <Reveal key={g.title}>
                <Card padding="md" className="relative h-full overflow-hidden">
                  <div className="flex items-center gap-2.5">
                    <span
                      aria-hidden="true"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-copper/12 text-copper [&_svg]:h-5 [&_svg]:w-5"
                    >
                      {g.icon}
                    </span>
                    <h3 className="font-sans text-h5 font-semibold text-text">{g.title}</h3>
                  </div>
                  <div className="relative mt-4">
                    <div className="pointer-events-none select-none opacity-90">{g.sample}</div>
                    <span className="absolute right-0 top-0">
                      <Badge tone="copper" icon={<Lock />}>
                        Sample
                      </Badge>
                    </span>
                  </div>
                </Card>
              </Reveal>
            ))}
          </div>

          <div className="mt-8 flex flex-col items-center gap-2">
            <Button to={unlockTo} variant="copper">
              {unlockLabel}
            </Button>
            <span className="text-body-sm font-semibold text-copper">
              $19.99–$29.99 one-time — no subscription
            </span>
          </div>
        </div>

        {/* Reassurance */}
        <Reveal className="mx-auto mt-20 max-w-prose text-center">
          <div className="inline-flex items-center gap-2 text-body-sm text-text-muted">
            <Boxes size={18} aria-hidden="true" className="text-accent-ink dark:text-accent" />
            No account is ever required to use the free tools.
          </div>
          <p className="mt-3 text-body-sm text-text-faint">
            We never sell your data or your leads. Delete everything with one click, anytime.
          </p>
        </Reveal>
      </section>
    </div>
  );
}
