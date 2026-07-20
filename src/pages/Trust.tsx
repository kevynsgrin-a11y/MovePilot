import { type ReactNode } from 'react';
import { m } from 'framer-motion';
import {
  Ban,
  CalendarClock,
  Database,
  Lock,
  ShieldCheck,
  Split,
  Trash2,
} from 'lucide-react';
import { Badge, Button, Card, Eyebrow, RouteLine } from '@/components/ui';
import { inViewOnce, revealUp, usePrefersReducedMotion } from '@/lib/motion';

/* ==========================================================================
   Trust — the Privacy Promise / how-it-works editorial (Blueprint §3.7).
   Ivory, 68ch measure, Fraunces headings, contour-line dividers. Load-bearing
   (top-nav + footer), not a footnote. Static content. Plain, honest voice.
   ========================================================================== */

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

const PROMISES = [
  {
    icon: <Lock />,
    title: 'Escrowed identity',
    body: 'You can use every calculator and carrier check without giving us a name, an email, or a phone number. There is nothing to escrow because we ask for nothing. If you save your work, it stays yours — encrypted and deletable in one click.',
  },
  {
    icon: <Split />,
    title: 'Double-blind routing',
    body: 'Most moving sites exist to auction your phone number to the highest bidder within seconds. We do not route you to anyone. If you ever choose to contact a carrier, neither side sees the other until you decide — we are not in the middle taking a cut.',
  },
  {
    icon: <ShieldCheck />,
    title: 'FMCSA-native verification',
    body: 'Carrier safety comes straight from federal SAFER records — authorization, insurance on file, crashes, inspections — updated weekly. No pay-to-rank, no sponsored movers, no fabricated star counts. Just the government record, in plain English.',
  },
  {
    icon: <Ban />,
    title: 'We never sell your data',
    body: 'Not to movers, not to brokers, not to advertisers. Our product is the math, not you. This is the whole reason MovePilot exists, and it will never change.',
  },
];

const STEPS = [
  {
    step: 'Step 1',
    title: 'You estimate — anonymously',
    body: 'Enter your rooms or inventory and two ZIPs. The backend computes exact volume, weight, distance, fuel, and a real cost range. No account, no contact details.',
    icon: <CalendarClock />,
  },
  {
    step: 'Step 2',
    title: 'You verify — with federal data',
    body: 'Look up any carrier by USDOT or MC number and read its authorization, insurance, and safety history sourced directly from FMCSA SAFER.',
    icon: <ShieldCheck />,
  },
  {
    step: 'Step 3',
    title: 'You orchestrate — on your terms',
    body: 'Optionally save a free account to keep a week-by-week timeline across devices. Everything is deletable, and nothing is ever sold or shared.',
    icon: <Database />,
  },
];

export function Trust() {
  return (
    <div className="relative">
      {/* Editorial hero */}
      <section className="container-mp py-16 md:py-24">
        <Reveal className="prose-mp mx-auto">
          <Eyebrow>Our privacy promise</Eyebrow>
          <h1 className="mt-3 font-display text-h1 font-medium text-text">
            We built the opposite of a moving-lead broker.
          </h1>
          <p className="mt-5 text-body-lg text-text-muted">
            Almost every &ldquo;free moving quote&rdquo; site is a lead farm: you enter your number,
            it gets sold to a dozen movers, and the phone starts ringing in ninety seconds. MovePilot
            is the deliberate inverse. Here is exactly how — and why — we keep it that way.
          </p>
        </Reveal>
      </section>

      <div aria-hidden="true" className="container-mp">
        <RouteLine className="h-12 opacity-50" variant="dashed" />
      </div>

      {/* The four promises */}
      <section className="container-mp py-16 md:py-20">
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-2">
          {PROMISES.map((p) => (
            <Reveal key={p.title}>
              <Card padding="lg" className="h-full">
                <span
                  aria-hidden="true"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-accent/10 text-accent-ink dark:text-accent [&_svg]:h-6 [&_svg]:w-6"
                >
                  {p.icon}
                </span>
                <h2 className="mt-4 font-display text-h4 font-medium text-text">{p.title}</h2>
                <p className="mt-3 text-body text-text-muted">{p.body}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      <div aria-hidden="true" className="container-mp">
        <RouteLine className="h-12 opacity-50" />
      </div>

      {/* How it works, editorial */}
      <section className="container-mp py-16 md:py-20">
        <Reveal className="prose-mp mx-auto mb-12">
          <Eyebrow>How it works</Eyebrow>
          <h2 className="mt-3 font-display text-h2 font-medium text-text">
            Three steps, and none of them sell you.
          </h2>
        </Reveal>
        <ol className="mx-auto max-w-4xl space-y-6">
          {STEPS.map((s) => (
            <Reveal key={s.step}>
              <li className="flex gap-5 rounded-lg border border-[color:var(--border)] bg-surface p-6 shadow-e2">
                <span
                  aria-hidden="true"
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent-ink dark:text-accent [&_svg]:h-6 [&_svg]:w-6"
                >
                  {s.icon}
                </span>
                <div>
                  <Eyebrow>{s.step}</Eyebrow>
                  <h3 className="mt-1 font-sans text-h5 font-semibold text-text">{s.title}</h3>
                  <p className="mt-2 text-body text-text-muted">{s.body}</p>
                </div>
              </li>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* Data-control closing band */}
      <section className="container-mp pb-24">
        <Reveal>
          <Card padding="lg" className="mx-auto max-w-4xl">
            <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
              <div className="prose-mp">
                <div className="flex items-center gap-2">
                  <Badge tone="accent" icon={<ShieldCheck />}>
                    Your data, your call
                  </Badge>
                </div>
                <h2 className="mt-4 font-display text-h3 font-medium text-text">
                  Delete everything, anytime — in one click.
                </h2>
                <p className="mt-3 text-body text-text-muted">
                  If you save a free account, your settings include a prominent
                  &ldquo;Delete my data&rdquo; control that wipes your inventory, timeline, and
                  account for good. No retention games, no dark patterns.
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-3">
                <Button to="/tools" variant="secondary">
                  Start anonymously
                </Button>
                <span className="inline-flex items-center gap-2 text-body-sm text-text-faint">
                  <Trash2 size={16} aria-hidden="true" />
                  One-click deletion in settings
                </span>
              </div>
            </div>
          </Card>
        </Reveal>

        <p className="mx-auto mt-10 max-w-prose text-center text-body-sm text-text-faint">
          Powered by federal FMCSA SAFER records · updated weekly. MovePilot is not a moving broker
          or lead-generation service.
        </p>
      </section>
    </div>
  );
}
