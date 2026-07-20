import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { m } from 'framer-motion';
import {
  ArrowRight,
  Ban,
  Boxes,
  Lock,
  MapPin,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  Truck,
} from 'lucide-react';
import {
  Button,
  Card,
  Eyebrow,
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
  type LatLng,
  type RouteSummary,
} from '@/lib/api';
import { usePrefersReducedMotion } from '@/lib/motion';

/* ==========================================================================
   /move/:origin-to-:destination — programmatic city-pair landing (§3.5).
   GET /api/routes/[slug] resolves the lane (origin/destination now carry
   {lat,lng}); the pre-filled mini-estimator fires ONE POST /api/calc/estimate
   with those exact coords — no client geocoding, no fabricated numbers. Honors
   `noindex` with a robots meta tag. 404 -> graceful "route not found" with
   links; never a dead end (an unknown-but-thin lane still renders the tool).
   ========================================================================== */

const BEDROOM_ORDER: BedroomKey[] = ['studio', 'one', 'two', 'three', 'four'];
const BEDROOM_LABEL: Record<BedroomKey, string> = {
  studio: 'Studio',
  one: '1BR',
  two: '2BR',
  three: '3BR',
  four: '4BR+',
};

const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

function errMsg(e: unknown): string {
  return e instanceof ApiError ? e.message : 'Something went wrong — please try again.';
}

function cityLabel(p: { city?: string; state?: string }): string {
  if (p.city && p.state) return `${p.city}, ${p.state}`;
  return p.city ?? '';
}

// ---------------------------------------------------------------------------
// noindex robots meta — mounted only while noindex is true (§3.5)
// ---------------------------------------------------------------------------

function useRobotsNoindex(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const tag = document.createElement('meta');
    tag.name = 'robots';
    tag.content = 'noindex';
    document.head.appendChild(tag);
    return () => {
      document.head.removeChild(tag);
    };
  }, [active]);
}

// ---------------------------------------------------------------------------
// Pre-filled mini-estimator — single source of numbers: POST /api/calc/estimate
// with the lane's {lat,lng} taken straight from the route response.
// ---------------------------------------------------------------------------

type EstStatus = 'loading' | 'ok' | 'error';

function LaneEstimator({
  origin,
  destination,
}: {
  origin: LatLng;
  destination: LatLng;
}) {
  const [catalog, setCatalog] = useState<CatalogResult | null>(null);
  const [catalogFailed, setCatalogFailed] = useState(false);
  const [bedrooms, setBedrooms] = useState<BedroomKey>('two');

  const [status, setStatus] = useState<EstStatus>('loading');
  const [result, setResult] = useState<EstimateResult | null>(null);
  const abortRef = useRef<AbortController | null>(null);

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

  // Fire the estimate for the pre-seeded lane (on mount + when home size changes).
  useEffect(() => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setStatus('loading');
    api.calc
      .estimate({ bedrooms, origin, destination }, ctrl.signal)
      .then((data) => {
        setResult(data);
        setStatus('ok');
      })
      .catch((e) => {
        if ((e as Error)?.name === 'AbortError') return;
        setResult(null);
        setStatus('error');
      });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bedrooms, origin.lat, origin.lng, destination.lat, destination.lng]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const loading = status === 'loading';
  const verdictIcon = result?.recommendation === 'full_service' ? <Truck /> : <PackageCheck />;

  return (
    <Card
      variant="frosted"
      padding="lg"
      className="mx-auto w-full max-w-md"
      as="section"
      aria-label="Estimate for this lane"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-h4 font-medium text-[#EAF1F7]">Estimate this lane</h2>
        <Sparkles size={18} aria-hidden="true" className="shrink-0 text-[#2FD3C1]" />
      </div>

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
            Home-size presets are unavailable — showing a 2-bedroom estimate.
          </p>
        ) : (
          <Skeleton className="h-10 w-full !bg-white/[0.06]" />
        )}
      </div>

      <div className="mt-6 grid grid-cols-3 gap-2" aria-live="polite" aria-atomic="true">
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
        <div className="flex flex-col gap-1 rounded-md border border-white/10 bg-white/[0.05] px-4 py-3">
          <span className="text-caption font-semibold uppercase tracking-[0.08em] text-[#8193A8]">
            Cost range
          </span>
          {loading ? (
            <Skeleton className="mt-1 h-8 w-20 !bg-white/[0.06]" />
          ) : status === 'ok' && result ? (
            <p
              className="data-hero text-h4 font-semibold leading-tight text-[#EAF1F7]"
              aria-label={`${money(result.cost_low_usd)} to ${money(result.cost_high_usd)}`}
            >
              {money(result.cost_low_usd)}
              <span className="text-[#8193A8]">–</span>
              {money(result.cost_high_usd)}
            </p>
          ) : (
            <p className="data-hero text-h3 font-semibold text-[#8193A8]">—</p>
          )}
        </div>
      </div>

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
        ) : (
          <p className="text-body-sm text-[#8193A8]">
            Estimate unavailable — try the full calculator.
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

// ---------------------------------------------------------------------------
// Loading skeleton hero
// ---------------------------------------------------------------------------

function HeroSkeleton() {
  return (
    <div className="container-mp grid grid-cols-1 items-center gap-10 py-14 md:grid-cols-12 md:py-16">
      <div className="flex flex-col gap-6 md:col-span-6" aria-busy="true">
        <span className="sr-only">Loading this route…</span>
        <Skeleton className="h-6 w-40 !bg-white/[0.08]" />
        <Skeleton className="h-16 w-full !bg-white/[0.08]" />
        <Skeleton className="h-16 w-4/5 !bg-white/[0.08]" />
        <Skeleton className="h-6 w-2/3 !bg-white/[0.08]" />
      </div>
      <div className="md:col-span-6 md:pl-6">
        <Skeleton className="h-80 w-full max-w-md rounded-2xl !bg-white/[0.06]" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 404 / unknown slug — graceful dead-end with links (never a raw error)
// ---------------------------------------------------------------------------

function RouteNotFound() {
  return (
    <div className="container-mp flex min-h-[60vh] flex-col items-center justify-center gap-4 py-16 text-center">
      <span
        aria-hidden="true"
        className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2FD3C1]/12 text-[#2FD3C1] [&_svg]:h-7 [&_svg]:w-7"
      >
        <MapPin />
      </span>
      <h1 className="font-display text-h2 font-medium text-[#EAF1F7]">
        We don&apos;t have that route yet
      </h1>
      <p className="max-w-prose text-body-lg text-[#A6B6C9]">
        That city pair isn&apos;t in our lane index — but every MovePilot calculator works for any
        move. Size your volume, check a carrier, or start from a common route.
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        <Button to="/tools">Open the calculators</Button>
        <Button to="/tools/carrier-check" variant="ghost">
          Verify a carrier
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

type PageStatus = 'loading' | 'ready' | 'notfound' | 'error';

export function Move() {
  const { slug = '' } = useParams();
  const [status, setStatus] = useState<PageStatus>('loading');
  const [route, setRoute] = useState<RouteSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setStatus('notfound');
      return;
    }
    const ctrl = new AbortController();
    setStatus('loading');
    api.routes
      .get(slug, ctrl.signal)
      .then((r) => {
        setRoute(r);
        setStatus('ready');
      })
      .catch((e) => {
        if ((e as Error)?.name === 'AbortError') return;
        if (e instanceof ApiError && e.code === 'NOT_FOUND') {
          setStatus('notfound');
        } else {
          setError(errMsg(e));
          setStatus('error');
        }
      });
    return () => ctrl.abort();
  }, [slug]);

  // Honor noindex only once we have a route flagged thin.
  useRobotsNoindex(status === 'ready' && Boolean(route?.noindex));

  const reduced = usePrefersReducedMotion();
  const fade = (delay: number, y = 16) =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, y },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] as const },
        };

  const originLabel = route ? cityLabel(route.origin) : '';
  const destLabel = route ? cityLabel(route.destination) : '';

  return (
    <section data-theme="dark" className="relative overflow-hidden bg-[#0B1220] text-[#EAF1F7]">
      <div aria-hidden="true" className="mesh-aurora absolute inset-0 -z-10" />

      {status === 'loading' ? (
        <HeroSkeleton />
      ) : status === 'notfound' ? (
        <RouteNotFound />
      ) : status === 'error' ? (
        <div className="container-mp flex min-h-[50vh] flex-col items-center justify-center gap-4 py-16 text-center">
          <h1 className="font-display text-h2 font-medium text-[#EAF1F7]">
            This route didn&apos;t load
          </h1>
          <p className="max-w-prose text-body-lg text-[#A6B6C9]">{error}</p>
          <div className="mt-2 flex gap-3">
            <Button to="/tools">Open the calculators</Button>
          </div>
        </div>
      ) : route ? (
        <>
          <div className="container-mp grid min-h-[calc(100svh-4rem)] grid-cols-1 items-center gap-10 py-14 md:grid-cols-12 md:py-16">
            {/* Left — lane copy */}
            <div className="order-2 flex flex-col gap-6 md:order-1 md:col-span-6">
              <m.div {...fade(0.1)}>
                <Eyebrow chip className="!text-[#2FD3C1] !border-[#2FD3C1]/30 !bg-[#2FD3C1]/10">
                  Moving guide
                </Eyebrow>
              </m.div>

              <m.h1
                {...fade(0.18, 24)}
                className="font-display text-display font-medium leading-[1.05] text-[#EAF1F7]"
              >
                Moving from {originLabel} to {destLabel}?
              </m.h1>

              <m.p {...fade(0.3, 20)} className="max-w-prose text-body-lg text-[#A6B6C9]">
                Get your exact cubic volume, shipping weight, and a real cost range for this lane —
                and verify any carrier against federal FMCSA records. No phone, no email, no lead
                brokers.
              </m.p>

              {/* Lane facts — all from the route response */}
              <m.dl {...fade(0.4)} className="grid grid-cols-3 gap-4 border-y border-white/10 py-5">
                <div className="flex flex-col gap-1">
                  <dt className="text-caption uppercase tracking-[0.08em] text-[#8193A8]">
                    Distance
                  </dt>
                  <dd className="data-hero tabular text-h4 font-semibold text-[#EAF1F7]">
                    {Math.round(route.distance_miles).toLocaleString('en-US')}
                    <span className="ml-1 text-body-sm font-medium text-[#8193A8]">mi</span>
                  </dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-caption uppercase tracking-[0.08em] text-[#8193A8]">
                    Est. fuel
                  </dt>
                  <dd className="data-hero tabular text-h4 font-semibold text-[#EAF1F7]">
                    {money(route.fuel_cost_usd)}
                  </dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-caption uppercase tracking-[0.08em] text-[#8193A8]">
                    Carriers on file
                  </dt>
                  <dd className="data-hero tabular text-h4 font-semibold text-[#EAF1F7]">
                    {(route.origin_carrier_count + route.dest_carrier_count).toLocaleString('en-US')}
                  </dd>
                </div>
              </m.dl>

              <m.div {...fade(0.48)} aria-hidden="true" className="max-w-md">
                <RouteLine className="h-20" animate />
                <div className="mt-1 flex items-center justify-between text-body-sm font-medium text-[#A6B6C9]">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#2FD3C1]" />
                    {originLabel}
                  </span>
                  <span className="flex items-center gap-1.5">
                    {destLabel}
                    <span className="h-2 w-2 rounded-full border-2 border-copper" />
                  </span>
                </div>
              </m.div>

              <m.div {...fade(0.54)} className="flex flex-wrap items-center gap-3">
                <Button to="/tools" size="lg">
                  Calculate my move — free
                </Button>
                <Button to="/tools/carrier-check" size="lg" variant="ghost">
                  Verify a carrier
                </Button>
              </m.div>

              <m.ul
                {...fade(0.6)}
                className="mt-1 flex flex-wrap gap-x-6 gap-y-2 text-body-sm text-[#A6B6C9]"
              >
                <li className="flex items-center gap-2">
                  <Lock size={16} aria-hidden="true" className="text-[#2FD3C1]" />
                  No email or phone required
                </li>
                <li className="flex items-center gap-2">
                  <ShieldCheck size={16} aria-hidden="true" className="text-[#2FD3C1]" />
                  FMCSA safety-verified
                </li>
                <li className="flex items-center gap-2">
                  <Ban size={16} aria-hidden="true" className="text-[#2FD3C1]" />
                  We don&apos;t sell leads — ever
                </li>
              </m.ul>
            </div>

            {/* Right — the pre-filled estimator on this lane's coordinates */}
            <m.div
              {...(reduced
                ? {}
                : {
                    initial: { opacity: 0, y: 28, scale: 0.98 },
                    animate: { opacity: 1, y: 0, scale: 1 },
                    transition: { duration: 0.6, delay: 0.5, ease: [0.16, 1, 0.3, 1] as const },
                  })}
              className="order-1 md:order-2 md:col-span-6 md:pl-6"
            >
              <LaneEstimator
                origin={{ lat: route.origin.lat, lng: route.origin.lng }}
                destination={{ lat: route.destination.lat, lng: route.destination.lng }}
              />
            </m.div>
          </div>

          {/* Cross-links — the four tools pre-seeded + popular routes */}
          <div className="border-t border-white/10 py-14">
            <div className="container-mp">
              <Eyebrow className="!text-[#2FD3C1]">Keep going</Eyebrow>
              <h2 className="mt-3 font-display text-h3 font-medium text-[#EAF1F7]">
                Everything you need for this move.
              </h2>
              <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  { to: '/tools/volume', name: 'Inventory → Volume', icon: <Boxes /> },
                  { to: '/tools/weight', name: 'Dimensional Weight', icon: <PackageCheck /> },
                  { to: '/tools/distance', name: 'Distance & Fuel', icon: <MapPin /> },
                  { to: '/tools/carrier-check', name: 'Verify a Carrier', icon: <ShieldCheck /> },
                ].map((t) => (
                  <Link
                    key={t.to}
                    to={t.to}
                    className={cn(
                      'group flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/[0.04] px-5 py-4',
                      'text-body font-medium text-[#EAF1F7] transition-colors hover:border-white/20 hover:bg-white/[0.07]',
                    )}
                  >
                    <span className="flex items-center gap-2.5">
                      <span aria-hidden="true" className="text-[#2FD3C1] [&_svg]:h-5 [&_svg]:w-5">
                        {t.icon}
                      </span>
                      {t.name}
                    </span>
                    <ArrowRight
                      size={16}
                      aria-hidden="true"
                      className="text-[#8193A8] transition-transform duration-fast group-hover:translate-x-0.5"
                    />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
