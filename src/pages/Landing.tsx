import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Link } from 'react-router-dom';
import { m } from 'framer-motion';
import {
  ArrowRight,
  Ban,
  Boxes,
  CalendarClock,
  CheckCircle2,
  Gauge,
  Lock,
  MapPin,
  PackageCheck,
  Radar,
  Route as RouteIcon,
  Scale,
  ShieldCheck,
  Sparkles,
  Split,
  Truck,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  Eyebrow,
  GaugeArc,
  Input,
  RouteLine,
  SegmentedControl,
  Skeleton,
  StatTile,
  type SegmentOption,
} from '@/components/ui';
import { cn } from '@/lib/cn';
import {
  api,
  ApiError,
  type BedroomKey,
  type CatalogResult,
  type EstimateResult,
  type FmcsaResult,
} from '@/lib/api';
import {
  inViewOnce,
  revealUp,
  staggerContainer,
  usePrefersReducedMotion,
} from '@/lib/motion';

/* ==========================================================================
   Landing — the full marketing page (Blueprint §3.1 + §5 Split-Proof Hero).
   Dark cockpit theme (set by routes.tsx theme:'dark'). Every number on this
   page is fetched from /api/* — the hero/teaser estimators call
   POST /api/calc/estimate, the spotlight calls GET /api/fmcsa/lookup. No
   fabricated data: pending -> skeleton, 422 -> inline prompt, error -> "—".
   ========================================================================== */

// ---------------------------------------------------------------------------
// Motion helpers (gated on reduced-motion; final layout position => CLS 0)
// ---------------------------------------------------------------------------

function Reveal({
  children,
  className,
  as = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'li' | 'article';
}) {
  const reduced = usePrefersReducedMotion();
  const Comp = m[as] as typeof m.div;
  if (reduced) {
    const Plain = as as 'div';
    return <Plain className={className}>{children}</Plain>;
  }
  return (
    <Comp
      className={className}
      variants={revealUp}
      initial="hidden"
      whileInView="visible"
      viewport={inViewOnce}
    >
      {children}
    </Comp>
  );
}

function Stagger({
  children,
  className,
  as = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'ul';
}) {
  const reduced = usePrefersReducedMotion();
  if (reduced) {
    const Plain = as as 'div';
    return <Plain className={className}>{children}</Plain>;
  }
  const Comp = m[as] as typeof m.div;
  return (
    <Comp
      className={className}
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={inViewOnce}
    >
      {children}
    </Comp>
  );
}

function StaggerChild({
  children,
  className,
  as = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'li' | 'article';
}) {
  const reduced = usePrefersReducedMotion();
  if (reduced) {
    const Plain = as as 'div';
    return <Plain className={className}>{children}</Plain>;
  }
  const Comp = m[as] as typeof m.div;
  return (
    <Comp className={className} variants={revealUp}>
      {children}
    </Comp>
  );
}

// ---------------------------------------------------------------------------
// Decorative topographic contour watermark (Blueprint §2.7.2)
// ---------------------------------------------------------------------------

function Contours({ className, opacity = 0.06 }: { className?: string; opacity?: number }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 600 400"
      preserveAspectRatio="xMidYMid slice"
      className={cn('pointer-events-none absolute inset-0 h-full w-full', className)}
      style={{ opacity }}
    >
      <g fill="none" stroke="var(--accent-bright)" strokeWidth="1">
        <path d="M-20 90 C 120 40, 260 140, 420 70 S 640 120, 640 60" />
        <path d="M-20 150 C 120 100, 260 200, 420 130 S 640 180, 640 120" />
        <path d="M-20 210 C 120 160, 260 260, 420 190 S 640 240, 640 180" />
        <path d="M-20 270 C 120 220, 260 320, 420 250 S 640 300, 640 240" />
        <path d="M-20 330 C 120 280, 260 380, 420 310 S 640 360, 640 300" />
      </g>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Live mini-estimator — the hero proof object + section-2 teaser.
// Single source of numbers: POST /api/calc/estimate.
// ---------------------------------------------------------------------------

const BEDROOM_ORDER: BedroomKey[] = ['studio', 'one', 'two', 'three', 'four'];
const BEDROOM_LABEL: Record<BedroomKey, string> = {
  studio: 'Studio',
  one: '1BR',
  two: '2BR',
  three: '3BR',
  four: '4BR+',
};

const ZIP_RE = /^\d{5}$/;
const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

type EstStatus = 'loading' | 'ok' | 'error' | 'unresolved';

function MiniEstimator({ title = 'Instant estimate — no signup' }: { title?: string }) {
  const [catalog, setCatalog] = useState<CatalogResult | null>(null);
  const [catalogFailed, setCatalogFailed] = useState(false);

  const [bedrooms, setBedrooms] = useState<BedroomKey>('two');
  const [fromZip, setFromZip] = useState('10001');
  const [toZip, setToZip] = useState('30301');

  const [status, setStatus] = useState<EstStatus>('loading');
  const [result, setResult] = useState<EstimateResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Populate the segmented control from the catalog (do NOT hardcode presets).
  useEffect(() => {
    const ctrl = new AbortController();
    api.catalog
      .items(ctrl.signal)
      .then(setCatalog)
      .catch((e) => {
        if ((e as Error)?.name !== 'AbortError') setCatalogFailed(true);
      });
    return () => ctrl.abort();
  }, []);

  const sizeOptions: SegmentOption<BedroomKey>[] = useMemo(() => {
    if (!catalog) return [];
    return BEDROOM_ORDER.filter((k) => catalog.bedroom_presets[k]).map((k) => ({
      value: k,
      label: BEDROOM_LABEL[k],
    }));
  }, [catalog]);

  const runEstimate = useCallback(() => {
    if (!ZIP_RE.test(fromZip) || !ZIP_RE.test(toZip)) {
      setStatus('unresolved');
      setResult(null);
      setMessage('Enter a 5-digit ZIP for both origin and destination.');
      return;
    }
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setStatus('loading');
    api.calc
      .estimate(
        { bedrooms, origin: { zip: fromZip }, destination: { zip: toZip } },
        ctrl.signal,
      )
      .then((data) => {
        setResult(data);
        setMessage(null);
        setStatus('ok');
      })
      .catch((e) => {
        if ((e as Error)?.name === 'AbortError') return;
        setResult(null);
        if (e instanceof ApiError && e.code === 'UNRESOLVED_LOCATION') {
          setStatus('unresolved');
          setMessage(
            e.message ||
              'Enter a supported metro ZIP or use the full calculator.',
          );
        } else {
          setStatus('error');
          setMessage('estimate unavailable');
        }
      });
  }, [bedrooms, fromZip, toZip]);

  // Debounced fetch on any input change (fires on first paint too).
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(runEstimate, 350);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [runEstimate]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const loading = status === 'loading';
  const verdictIcon =
    result?.recommendation === 'full_service' ? <Truck /> : <PackageCheck />;

  return (
    <Card
      variant="frosted"
      padding="lg"
      className="mx-auto w-full max-w-md"
      as="section"
      aria-label="Instant moving estimate"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-h4 font-medium text-[#EAF1F7]">{title}</h2>
        <Sparkles size={18} aria-hidden="true" className="shrink-0 text-[#2FD3C1]" />
      </div>

      {/* Home size — options sourced from /api/catalog/items bedroom_presets */}
      <div className="mt-5">
        <p className="mb-2 text-caption font-semibold uppercase tracking-[0.08em] text-[#8193A8]">
          Home size
        </p>
        {sizeOptions.length > 0 ? (
          <SegmentedControl
            options={sizeOptions}
            value={bedrooms}
            onChange={setBedrooms}
            ariaLabel="Home size"
            size="sm"
            block
            className="!bg-white/[0.06] !border-white/10"
          />
        ) : catalogFailed ? (
          <p className="text-body-sm text-[#8193A8]">
            Home-size presets are unavailable right now — showing a 2-bedroom estimate.
          </p>
        ) : (
          <Skeleton className="h-10 w-full !bg-white/[0.06]" />
        )}
      </div>

      {/* Route ZIPs — resolved to coordinates server-side by /api/calc/estimate */}
      <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-end gap-2">
        <Input
          label="From ZIP"
          value={fromZip}
          onChange={(e) => setFromZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
          inputMode="numeric"
          autoComplete="postal-code"
          placeholder="10001"
          className="!text-[#EAF1F7]"
          containerClassName="[&_label]:text-[#A6B6C9]"
        />
        <div className="pb-3 text-[#2FD3C1]" aria-hidden="true">
          <ArrowRight size={18} />
        </div>
        <Input
          label="To ZIP"
          value={toZip}
          onChange={(e) => setToZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
          inputMode="numeric"
          autoComplete="postal-code"
          placeholder="30301"
          className="!text-[#EAF1F7]"
          containerClassName="[&_label]:text-[#A6B6C9]"
        />
      </div>

      {/* Live output tiles — every figure from the one estimate response */}
      <div
        className="mt-6 grid grid-cols-3 gap-2"
        aria-live="polite"
        aria-atomic="true"
      >
        <StatTile
          label="Cubic feet"
          value={status === 'ok' ? result?.total_cuft ?? null : null}
          loading={loading}
          unit="cu ft"
          emptyNote={status === 'error' ? 'estimate unavailable' : undefined}
          className="!bg-white/[0.05] !border-white/10 [&_*]:!text-[#EAF1F7] [&_span:first-child]:!text-[#8193A8]"
        />
        <StatTile
          label="Weight"
          value={status === 'ok' ? result?.est_weight_lbs ?? null : null}
          loading={loading}
          unit="lb"
          ariaLabel={
            result ? `${Math.round(result.est_weight_lbs).toLocaleString()} pounds` : undefined
          }
          className="!bg-white/[0.05] !border-white/10 [&_*]:!text-[#EAF1F7] [&_span:first-child]:!text-[#8193A8]"
        />
        <CostRangeTile
          low={status === 'ok' ? result?.cost_low_usd : undefined}
          high={status === 'ok' ? result?.cost_high_usd : undefined}
          loading={loading}
          error={status === 'error'}
        />
      </div>

      {/* Verdict badge — recommendation + recommendation_text */}
      <div className="mt-4 min-h-[2.25rem]">
        {loading ? (
          <Skeleton className="h-6 w-3/4 !bg-white/[0.06]" />
        ) : status === 'ok' && result ? (
          <p className="flex items-start gap-2 text-body-sm text-[#A6B6C9]">
            <span aria-hidden="true" className="mt-0.5 shrink-0 text-[#2FD3C1]">
              {verdictIcon}
            </span>
            <span>{result.recommendation_text}</span>
          </p>
        ) : status === 'unresolved' ? (
          <p className="text-body-sm text-[#F0B24A]">{message}</p>
        ) : (
          <p className="text-body-sm text-[#8193A8]">
            Estimate unavailable — try again or open the full calculator.
          </p>
        )}
      </div>

      <div className="mt-6 border-t border-white/10 pt-4">
        <Link
          to="/tools/volume"
          className="group inline-flex items-center gap-1.5 text-body-sm font-semibold text-[#2FD3C1]"
        >
          See the full breakdown
          <ArrowRight
            size={16}
            aria-hidden="true"
            className="transition-transform duration-fast group-hover:translate-x-0.5"
          />
        </Link>
      </div>
    </Card>
  );
}

function CostRangeTile({
  low,
  high,
  loading,
  error,
}: {
  low?: number;
  high?: number;
  loading?: boolean;
  error?: boolean;
}) {
  const hasValue = typeof low === 'number' && typeof high === 'number';
  return (
    <div className="flex flex-col gap-1 rounded-md border border-white/10 bg-white/[0.05] px-4 py-3">
      <span className="text-caption font-semibold uppercase tracking-[0.08em] text-[#8193A8]">
        Cost range
      </span>
      {loading ? (
        <Skeleton className="mt-1 h-8 w-20 !bg-white/[0.06]" />
      ) : hasValue ? (
        <p
          className="data-hero text-h4 font-semibold leading-tight text-[#EAF1F7]"
          aria-label={`${money(low as number)} to ${money(high as number)}`}
        >
          {money(low as number)}
          <span className="text-[#8193A8]">–</span>
          {money(high as number)}
        </p>
      ) : (
        <p className="data-hero text-h3 font-semibold text-[#8193A8]">—</p>
      )}
      {error && !hasValue && !loading && (
        <span className="text-body-sm text-[#8193A8]">estimate unavailable</span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 1 — Split-Proof Hero
// ---------------------------------------------------------------------------

function Hero() {
  const reduced = usePrefersReducedMotion();
  const fade = (delay: number, y = 16) =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, y },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] as const },
        };

  return (
    <section className="relative overflow-hidden">
      {/* Cockpit background: mesh-aurora + contours + one animated route-line arc */}
      <div aria-hidden="true" className="mesh-aurora absolute inset-0 -z-10" />
      <Contours className="-z-10" opacity={0.05} />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-16 -z-10 w-[60%] opacity-40"
      >
        <RouteLine className="h-48" animate />
      </div>

      <div className="container-mp grid min-h-[calc(100svh-4rem)] grid-cols-1 items-center gap-10 py-14 md:grid-cols-12 md:py-16">
        {/* Left column — copy (cols 1–6). On mobile the estimator comes first. */}
        <div className="order-2 flex flex-col gap-6 md:order-1 md:col-span-6">
          <m.div {...fade(0.12)}>
            <Eyebrow chip className="!text-[#2FD3C1] !border-[#2FD3C1]/30 !bg-[#2FD3C1]/10">
              Privacy-first relocation
            </Eyebrow>
          </m.div>

          <m.h1
            {...fade(0.2, 24)}
            className="font-display text-display font-medium text-[#EAF1F7]"
          >
            Plan your move on real math, not a hundred spam calls.
          </m.h1>

          <m.p {...fade(0.34, 20)} className="max-w-prose text-body-lg text-[#A6B6C9]">
            MovePilot calculates your exact cubic volume, shipping weight, and cost from your own
            inventory — and verifies any carrier against federal FMCSA safety records. No phone. No
            email. No lead brokers.
          </m.p>

          <m.div {...fade(0.46)} className="flex flex-wrap items-center gap-3">
            <Button to="/tools" size="lg">
              Calculate my move — free
            </Button>
            <Button to="/tools/carrier-check" size="lg" variant="ghost">
              Verify a carrier
            </Button>
          </m.div>

          <m.p {...fade(0.52)} className="text-body-sm text-[#8193A8]">
            No account needed. We never sell your data.
          </m.p>

          <m.ul
            {...fade(0.56)}
            className="mt-1 flex flex-wrap gap-x-6 gap-y-2 text-body-sm text-[#A6B6C9]"
          >
            <li className="flex items-center gap-2">
              <Lock size={16} aria-hidden="true" className="text-[#2FD3C1]" />
              No email or phone required
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck size={16} aria-hidden="true" className="text-[#2FD3C1]" />
              FMCSA safety-verified data
            </li>
            <li className="flex items-center gap-2">
              <Ban size={16} aria-hidden="true" className="text-[#2FD3C1]" />
              We don&apos;t sell leads — ever
            </li>
          </m.ul>

          <m.p {...fade(0.6)} className="text-caption text-[#8193A8]">
            Powered by federal FMCSA SAFER records · updated weekly
          </m.p>
        </div>

        {/* Right column — the live proof card (cols 7–12) */}
        <m.div
          {...(reduced
            ? {}
            : {
                initial: { opacity: 0, y: 28, scale: 0.98 },
                animate: { opacity: 1, y: 0, scale: 1 },
                transition: { duration: 0.62, delay: 0.62, ease: [0.16, 1, 0.3, 1] as const },
              })}
          className="order-1 md:order-2 md:col-span-6 md:pl-6"
        >
          <MiniEstimator />
        </m.div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Section 3 — 4 Tools bento
// ---------------------------------------------------------------------------

interface Tool {
  to: string;
  name: string;
  jtbd: string;
  icon: ReactNode;
  flagship?: boolean;
}

const TOOLS: Tool[] = [
  {
    to: '/tools/volume',
    name: 'Inventory → Volume',
    jtbd: 'Turn your actual furniture and boxes into exact cubic feet and CBM.',
    icon: <Boxes />,
    flagship: true,
  },
  {
    to: '/tools/weight',
    name: 'Dimensional Weight',
    jtbd: 'Get billable weight and see whether a DIY truck or LTL freight wins.',
    icon: <Scale />,
  },
  {
    to: '/tools/distance',
    name: 'Distance & Fuel',
    jtbd: 'Real driving miles, gallons, and fuel cost between two ZIPs.',
    icon: <RouteIcon />,
  },
  {
    to: '/tools/carrier-check',
    name: 'Verify a Carrier',
    jtbd: 'Check any mover against federal FMCSA authorization and insurance.',
    icon: <ShieldCheck />,
  },
];

function ToolsBento() {
  return (
    <section className="relative border-t border-[color:var(--border)] py-20 md:py-28">
      <div className="container-mp">
        <Reveal className="mb-12 max-w-prose">
          <Eyebrow>The instrument panel</Eyebrow>
          <h2 className="mt-3 font-display text-h2 font-medium text-text">
            Four precise tools. Zero sales pressure.
          </h2>
          <p className="mt-4 text-body-lg text-text-muted">
            Each one runs on real math from your inputs — no account, no phone number, no
            &ldquo;get quotes&rdquo; trap.
          </p>
        </Reveal>

        <Stagger className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {TOOLS.map((t) => (
            <StaggerChild key={t.to} as="article" className={t.flagship ? 'md:row-span-1' : ''}>
              <Link to={t.to} className="block h-full">
                <Card
                  interactive
                  padding="lg"
                  className={cn(
                    'group relative h-full overflow-hidden',
                    t.flagship && 'md:min-h-[16rem]',
                  )}
                >
                  {t.flagship && (
                    <RouteLine
                      endpoints={false}
                      className="pointer-events-none absolute -right-10 -top-8 w-2/3 opacity-[0.08]"
                    />
                  )}
                  <div className="flex h-full flex-col">
                    <span
                      aria-hidden="true"
                      className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-accent/10 text-accent-ink dark:text-accent [&_svg]:h-6 [&_svg]:w-6"
                    >
                      {t.icon}
                    </span>
                    <h3 className="mt-4 font-sans text-h4 font-semibold text-text">{t.name}</h3>
                    <p className="mt-2 max-w-prose text-body text-text-muted">{t.jtbd}</p>
                    <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-body-sm font-semibold text-accent-ink dark:text-accent">
                      Try it
                      <ArrowRight
                        size={16}
                        aria-hidden="true"
                        className="transition-transform duration-fast group-hover:translate-x-0.5"
                      />
                    </span>
                  </div>
                </Card>
              </Link>
            </StaggerChild>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Section 4 — Anti-lead-broker manifesto
// ---------------------------------------------------------------------------

const MANIFESTO = [
  {
    icon: <Lock />,
    label: 'Escrowed identity',
    body: 'Your name and number never enter a marketplace. We hold nothing we can sell.',
  },
  {
    icon: <Split />,
    label: 'Double-blind routing',
    body: 'If you ever contact a carrier, neither side sees the other until you choose to.',
  },
  {
    icon: <ShieldCheck />,
    label: 'FMCSA-verified',
    body: 'Carrier safety comes straight from federal SAFER records — not paid placement.',
  },
];

function Manifesto() {
  return (
    <section
      data-theme="dark"
      className="relative overflow-hidden bg-[#0B1220] py-20 text-[#EAF1F7] md:py-28"
    >
      <Contours opacity={0.06} />
      <div className="container-mp relative">
        <Reveal className="mx-auto max-w-3xl text-center">
          <Eyebrow className="!text-[#2FD3C1]">Why we exist</Eyebrow>
          <h2 className="mt-4 font-display text-h2 font-medium text-[#EAF1F7]">
            Every other site sells your number in 90 seconds. We built the opposite.
          </h2>
          <p className="mx-auto mt-5 max-w-prose text-body-lg text-[#A6B6C9]">
            A moving-lead broker&apos;s product is you. Ours is math. Here is exactly how that stays
            true.
          </p>
        </Reveal>

        <Stagger className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
          {MANIFESTO.map((p) => (
            <StaggerChild key={p.label}>
              <div className="flex h-full flex-col rounded-lg border border-[#1D2B40] bg-[#0F1A2C] p-6">
                <span
                  aria-hidden="true"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-[#2FD3C1]/12 text-[#2FD3C1] [&_svg]:h-6 [&_svg]:w-6"
                >
                  {p.icon}
                </span>
                <h3 className="mt-4 font-sans text-h5 font-semibold text-[#EAF1F7]">{p.label}</h3>
                <p className="mt-2 text-body text-[#A6B6C9]">{p.body}</p>
              </div>
            </StaggerChild>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Section 5 — How it works, 3 steps
// ---------------------------------------------------------------------------

const STEPS = [
  {
    step: 'Step 1',
    title: 'Estimate',
    body: 'List your rooms or your inventory. Get exact volume, weight, and a real cost range in seconds.',
    icon: <Boxes />,
  },
  {
    step: 'Step 2',
    title: 'Verify',
    body: 'Enter any carrier’s USDOT or MC number. See federal authorization, insurance, and safety history.',
    icon: <ShieldCheck />,
  },
  {
    step: 'Step 3',
    title: 'Orchestrate',
    body: 'Generate a week-by-week move timeline and keep everything in one private control center.',
    icon: <CalendarClock />,
  },
];

function HowItWorks() {
  return (
    <section className="relative py-20 md:py-28">
      <div className="container-mp">
        <Reveal className="mb-14 max-w-prose">
          <Eyebrow>How it works</Eyebrow>
          <h2 className="mt-3 font-display text-h2 font-medium text-text">
            Estimate, verify, orchestrate.
          </h2>
        </Reveal>

        <div aria-hidden="true" className="mb-10 hidden md:block">
          <RouteLine className="h-16 opacity-60" />
        </div>

        <Stagger className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {STEPS.map((s) => (
            <StaggerChild key={s.step}>
              <Card padding="lg" className="h-full">
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-accent/10 text-accent-ink dark:text-accent [&_svg]:h-6 [&_svg]:w-6"
                  >
                    {s.icon}
                  </span>
                  <Eyebrow>{s.step}</Eyebrow>
                </div>
                <h3 className="mt-4 font-sans text-h4 font-semibold text-text">{s.title}</h3>
                <p className="mt-2 text-body text-text-muted">{s.body}</p>
              </Card>
            </StaggerChild>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Section 6 — FMCSA verification spotlight (live /api/fmcsa/lookup)
// ---------------------------------------------------------------------------

function FmcsaSpotlight() {
  const [state, setState] = useState<'loading' | 'found' | 'notfound' | 'stale'>('loading');
  const [data, setData] = useState<FmcsaResult | null>(null);
  const DEMO_USDOT = '1234567';

  useEffect(() => {
    const ctrl = new AbortController();
    api.fmcsa
      .lookup({ usdot: DEMO_USDOT }, ctrl.signal)
      .then((res) => {
        setData(res);
        setState(res.found ? 'found' : 'notfound');
      })
      .catch((e) => {
        if ((e as Error)?.name === 'AbortError') return;
        // 502 UPSTREAM -> staleness banner; any other error -> not-verifiable note.
        setState('stale');
      });
    return () => ctrl.abort();
  }, []);

  const found = state === 'found' && data?.found ? data : null;
  const authorized = found?.authorized_for_hhg ?? false;
  const verdict = found ? (authorized ? 'success' : 'danger') : 'neutral';
  // Score is illustrative of authorization + insurance status, derived only from
  // the fetched record's booleans — never a fabricated safety metric.
  const score = found
    ? (authorized ? 60 : 0) + (found.meets_750k_minimum ? 40 : 0)
    : null;

  return (
    <section className="relative border-t border-[color:var(--border)] py-20 md:py-28">
      <div className="container-mp">
        <Reveal className="mb-10 max-w-prose">
          <Eyebrow>Federal safety data</Eyebrow>
          <h2 className="mt-3 font-display text-h2 font-medium text-text">
            The hardest thing to fake: a real FMCSA record.
          </h2>
          <p className="mt-4 text-body-lg text-text-muted">
            Every carrier check reads live from federal SAFER records — authorization, insurance on
            file, crashes, inspections. Plain English, no spin.
          </p>
        </Reveal>

        <Reveal>
          <Card
            padding="lg"
            className="rounded-xl"
            as="section"
            aria-labelledby="fmcsa-spotlight-title"
          >
            <div className="grid grid-cols-1 gap-8 md:grid-cols-[auto_1fr] md:items-center">
              {/* Gauge */}
              <div className="flex flex-col items-center gap-3">
                <GaugeArc
                  value={score}
                  verdict={verdict}
                  scanning={state === 'loading'}
                  ariaLabel="Carrier authorization score"
                >
                  {state === 'loading' ? (
                    <Skeleton className="h-8 w-12" />
                  ) : found ? (
                    <>
                      <span className="data-hero text-h2 font-semibold text-text">{score}</span>
                      <span className="text-caption uppercase tracking-[0.08em] text-text-faint">
                        of 100
                      </span>
                    </>
                  ) : (
                    <span className="text-h3 text-text-faint">—</span>
                  )}
                </GaugeArc>
                {found &&
                  (authorized ? (
                    <span className="relative inline-flex">
                      <Badge tone="success" icon={<CheckCircle2 />}>
                        Authorized
                      </Badge>
                      <span
                        aria-hidden="true"
                        className="absolute inset-0 -z-10 animate-ping2 rounded-pill bg-[color:var(--success)]/30"
                      />
                    </span>
                  ) : (
                    <Badge tone="danger" icon={<Ban />}>
                      Not authorized
                    </Badge>
                  ))}
              </div>

              {/* Record */}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Gauge size={18} aria-hidden="true" className="text-accent-ink dark:text-accent" />
                  <h3 id="fmcsa-spotlight-title" className="font-sans text-h5 font-semibold text-text">
                    {state === 'loading' ? (
                      <Skeleton className="h-6 w-56" />
                    ) : found ? (
                      found.carrier_name || 'Carrier record'
                    ) : (
                      'Live FMCSA lookup'
                    )}
                  </h3>
                </div>

                {state === 'stale' ? (
                  <div className="mt-4 flex items-start gap-2 rounded-md border border-[color:var(--warn)]/40 bg-[color:var(--warn)]/10 p-4">
                    <ShieldCheck
                      size={18}
                      aria-hidden="true"
                      className="mt-0.5 shrink-0 text-[color:var(--warn)]"
                    />
                    <p className="text-body-sm text-text-muted">
                      FMCSA source temporarily unavailable — no cached record to show right now. Try
                      a live lookup on the carrier-check tool.
                    </p>
                  </div>
                ) : state === 'notfound' ? (
                  <p className="mt-4 text-body text-text-muted">
                    That USDOT isn&apos;t verifiable or cached yet. Run any real USDOT or MC number
                    through the full carrier check to see its federal record.
                  </p>
                ) : state === 'loading' ? (
                  <div className="mt-4 space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-4/6" />
                  </div>
                ) : found ? (
                  <>
                    <dl className="mt-4 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
                      <Row term="Operating status" val={found.operating_status} />
                      <Row
                        term="Authorized for HHG"
                        val={found.authorized_for_hhg ? 'Yes' : 'No'}
                      />
                      <Row
                        term="Insurance on file"
                        val={
                          found.insurance_on_file_usd != null
                            ? money(found.insurance_on_file_usd)
                            : '—'
                        }
                      />
                      <Row
                        term="Meets $750k minimum"
                        val={found.meets_750k_minimum ? 'Yes' : 'No'}
                      />
                      <Row term="Crashes on record" val={String(found.crash_total ?? '—')} />
                      <Row term="Inspections" val={String(found.inspection_total ?? '—')} />
                    </dl>
                    {found.plain_english?.length > 0 && (
                      <ul className="mt-4 space-y-1.5 text-body-sm text-text-muted">
                        {found.plain_english.map((line, i) => (
                          <li key={i}>{line}</li>
                        ))}
                      </ul>
                    )}
                    <p className="data-raw mt-4 text-body-sm text-text-faint">
                      USDOT {found.usdot} · source {found.source} · last queried{' '}
                      <time dateTime={found.fetched_at}>{found.fetched_at}</time>
                    </p>
                  </>
                ) : null}

                <div className="mt-6">
                  <Button to="/tools/carrier-check" variant="secondary" size="sm">
                    Verify a carrier
                    <ArrowRight size={16} aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </Reveal>
      </div>
    </section>
  );
}

function Row({ term, val }: { term: string; val: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-caption uppercase tracking-[0.08em] text-text-faint">{term}</dt>
      <dd className="text-body font-medium text-text tabular">{val}</dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 7 — Timeline preview
// ---------------------------------------------------------------------------

const TIMELINE_WEEKS = [
  { out: '8 weeks out', task: 'Inventory every room and lock your volume estimate.' },
  { out: '6 weeks out', task: 'Verify carriers and gather written quotes.' },
  { out: '4 weeks out', task: 'Book your mover or truck and confirm the date.' },
  { out: '2 weeks out', task: 'Transfer utilities and file your change of address.' },
  { out: 'Move week', task: 'Pack the essentials box and confirm arrival logistics.' },
];

function TimelinePreview() {
  return (
    <section className="relative py-20 md:py-28">
      <div className="container-mp grid grid-cols-1 gap-12 md:grid-cols-2 md:items-center">
        <Reveal>
          <Eyebrow>Your move, on rails</Eyebrow>
          <h2 className="mt-3 font-display text-h2 font-medium text-text">
            A week-by-week timeline that keeps the whole move on schedule.
          </h2>
          <p className="mt-4 text-body-lg text-text-muted">
            Pick a move date and MovePilot builds a countdown of exactly what to do, when. Save a
            free account to keep your progress across devices.
          </p>
          <div className="mt-6">
            <Button to="/timeline" variant="secondary">
              Preview the timeline
              <ArrowRight size={16} aria-hidden="true" />
            </Button>
          </div>
        </Reveal>

        <Reveal>
          <ol className="relative ml-2 space-y-6 border-l-2 border-dashed border-[color:var(--border-strong)] pl-8">
            {TIMELINE_WEEKS.map((w, i) => (
              <li key={w.out} className="relative">
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute -left-[2.6rem] top-1 h-4 w-4 rounded-full border-2',
                    i === 0
                      ? 'border-accent bg-accent shadow-glow-accent'
                      : 'border-[color:var(--border-strong)] bg-[color:var(--bg)]',
                  )}
                />
                <Eyebrow>{w.out}</Eyebrow>
                <p className="mt-1 text-body text-text-muted">{w.task}</p>
              </li>
            ))}
          </ol>
        </Reveal>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Section 8 — Premium / Relocation Vault teaser (the ONLY copper on the page)
// ---------------------------------------------------------------------------

function VaultTeaser() {
  return (
    <section className="relative py-20 md:py-28">
      <div className="container-mp">
        <Reveal>
          <Card
            variant="copper"
            padding="lg"
            className="relative overflow-hidden rounded-xl border-copper/60 bg-[linear-gradient(135deg,var(--surface),var(--copper-tint))] dark:bg-[linear-gradient(135deg,var(--surface),rgba(183,121,63,0.12))]"
          >
            <div className="grid grid-cols-1 gap-8 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <Eyebrow className="!text-copper">Relocation Vault · Premium</Eyebrow>
                <h2 className="mt-3 font-display text-h2 font-medium text-text">
                  Normalize every quote. Catch the padded ones.
                </h2>
                <p className="mt-4 max-w-prose text-body-lg text-text-muted">
                  Drop in competing quotes and the Vault normalizes price-per-pound, flags density
                  anomalies, and ranks DIY vs container vs full-service — so you can&apos;t be
                  overcharged.
                </p>
                <ul className="mt-5 space-y-2 text-body text-text-muted">
                  <li className="flex items-center gap-2">
                    <Radar size={18} aria-hidden="true" className="text-copper" />
                    Quote normalization &amp; anomaly detection
                  </li>
                  <li className="flex items-center gap-2">
                    <PackageCheck size={18} aria-hidden="true" className="text-copper" />
                    Multi-scenario cost comparison
                  </li>
                </ul>
                <div className="mt-7 flex flex-wrap items-center gap-4">
                  <Button to="/pricing" variant="copper" size="lg">
                    Unlock the Vault
                  </Button>
                  <span className="text-body font-semibold text-copper">
                    $19.99–$29.99 one-time — no subscription
                  </span>
                </div>
              </div>

              <div
                aria-hidden="true"
                className="hidden shrink-0 rounded-lg border border-copper/40 bg-surface/60 p-6 md:block"
              >
                <div className="flex items-center justify-center">
                  <span className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-copper/12 text-copper [&_svg]:h-10 [&_svg]:w-10">
                    <Radar />
                  </span>
                </div>
                <p className="mt-4 text-center text-caption uppercase tracking-[0.08em] text-copper">
                  Anomaly radar
                </p>
              </div>
            </div>
          </Card>
        </Reveal>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Section 9 — Popular routes (programmatic SEO grid)
// ---------------------------------------------------------------------------

const ROUTE_SLUGS = [
  'chicago-il_austin-tx',
  'los-angeles-ca_new-york-ny',
  'seattle-wa_denver-co',
  'miami-fl_atlanta-ga',
];

function titleizeCity(part: string): string {
  const segs = part.split('-');
  const state = segs.pop()?.toUpperCase() ?? '';
  const city = segs.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
  return `${city}, ${state}`;
}

function routeLabel(slug: string): string {
  const [origin, dest] = slug.split('_');
  return `${titleizeCity(origin)} → ${titleizeCity(dest)}`;
}

function PopularRoutes() {
  return (
    <section id="routes" className="scroll-mt-16 border-t border-[color:var(--border)] py-20 md:py-24">
      <div className="container-mp">
        <Reveal className="mb-8 max-w-prose">
          <Eyebrow>Popular routes</Eyebrow>
          <h2 className="mt-3 font-display text-h3 font-medium text-text">
            Start from a common move.
          </h2>
        </Reveal>
        <Stagger className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {ROUTE_SLUGS.map((slug) => (
            <StaggerChild key={slug}>
              <Link
                to={`/move/${slug}`}
                className="group flex items-center justify-between gap-3 rounded-md border border-[color:var(--border)] bg-surface px-5 py-4 text-body font-medium text-text transition-colors hover:border-[color:var(--border-strong)] hover:bg-surface-sunk"
              >
                <span className="flex items-center gap-2.5">
                  <MapPin size={18} aria-hidden="true" className="text-accent-ink dark:text-accent" />
                  {routeLabel(slug)}
                </span>
                <ArrowRight
                  size={16}
                  aria-hidden="true"
                  className="text-text-faint transition-transform duration-fast group-hover:translate-x-0.5"
                />
              </Link>
            </StaggerChild>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Section 10 — Final CTA band
// ---------------------------------------------------------------------------

function FinalCta() {
  return (
    <section
      data-theme="dark"
      className="relative overflow-hidden bg-[#0B1220] py-24 text-[#EAF1F7] md:py-32"
    >
      <div aria-hidden="true" className="mesh-aurora absolute inset-0 opacity-90" />
      <Contours opacity={0.06} />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 top-1/3"
        style={{
          background:
            'linear-gradient(180deg, rgba(11,18,32,0) 0%, rgba(11,18,32,0.35) 45%, rgba(11,18,32,0.82) 100%)',
        }}
      />
      <div className="container-mp relative text-center">
        <Reveal>
          <h2 className="mx-auto max-w-3xl font-display text-h1 font-medium text-[#EAF1F7]">
            Calculate your move on real numbers — in about a minute.
          </h2>
          <div className="mt-8 flex justify-center">
            <Button to="/tools" size="lg">
              Calculate my move — free
            </Button>
          </div>
          <p className="mt-4 text-body-sm text-[#8193A8]">
            No account needed. We never sell your data.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Section 2 — Live tool teaser (frosted estimator on ink, no scroll gap)
// ---------------------------------------------------------------------------

function LiveTeaser() {
  return (
    <section data-theme="dark" className="relative overflow-hidden bg-[#0B1220] py-16 md:py-20">
      <Contours opacity={0.05} />
      <div className="container-mp relative grid grid-cols-1 items-center gap-10 md:grid-cols-2">
        <Reveal>
          <Eyebrow className="!text-[#2FD3C1]">Try it right now</Eyebrow>
          <h2 className="mt-3 font-display text-h2 font-medium text-[#EAF1F7]">
            Change the home size or the route. The numbers move — live.
          </h2>
          <p className="mt-4 max-w-prose text-body-lg text-[#A6B6C9]">
            This is the real estimator, not a screenshot. Every figure is computed by the backend
            the instant you change an input — no signup, no fabricated numbers.
          </p>
        </Reveal>
        <Reveal>
          <MiniEstimator title="Live estimate" />
        </Reveal>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function Landing() {
  return (
    <>
      <Hero />
      <LiveTeaser />
      <ToolsBento />
      <Manifesto />
      <HowItWorks />
      <FmcsaSpotlight />
      <TimelinePreview />
      <VaultTeaser />
      <PopularRoutes />
      <FinalCta />
    </>
  );
}
