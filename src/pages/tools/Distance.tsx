import { useCallback, useEffect, useRef, useState } from 'react';
import { MapPin, AlertTriangle, CheckCircle2, Loader2, Navigation } from 'lucide-react';
import { api, ApiError, type DistanceFuelResult, type LatLng } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { StatTile } from '@/components/ui/StatTile';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { RouteLine } from '@/components/ui/RouteLine';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Button } from '@/components/ui/Button';

/**
 * /tools/distance — Distance + fuel (§3.3). Left: origin/destination inputs. A ZIP is
 * resolved to real coordinates via GET /api/geo/resolve?zip= (seeded ZIP-3 centroids);
 * an unseeded prefix (found:false) prompts for a supported metro or lat/lng instead of
 * fabricating coordinates. Once both endpoints resolve, POST /api/calc/distance-fuel.
 * Right: driving_miles / gallons / fuel_cost readouts + the route-line arc + the
 * constants footnote — every figure fetched, none computed here.
 */

function errMsg(e: unknown): string {
  return e instanceof ApiError ? e.message : 'Something went wrong — please try again.';
}

type Resolved = { coord: LatLng; label: string | null };
type EndpointStatus = 'idle' | 'resolving' | 'ok' | 'notfound' | 'error';

function EndpointField({
  label,
  seedZip,
  seedKey,
  onResolved,
}: {
  label: string;
  seedZip: string | null;
  seedKey: number;
  onResolved: (r: Resolved | null) => void;
}) {
  const [mode, setMode] = useState<'zip' | 'coords'>('zip');
  const [zip, setZip] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [status, setStatus] = useState<EndpointStatus>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const resolvedRef = useRef<Resolved | null>(null);
  const emit = useCallback(
    (r: Resolved | null) => {
      resolvedRef.current = r;
      onResolved(r);
    },
    [onResolved],
  );

  // Seed (sample-route loader) — set ZIP mode + value from the parent.
  useEffect(() => {
    if (seedKey === 0 || seedZip == null) return;
    setMode('zip');
    setZip(seedZip);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedKey]);

  // ZIP resolution (debounced) via GET /api/geo/resolve
  useEffect(() => {
    if (mode !== 'zip') return;
    const trimmed = zip.trim();
    if (!/^\d{5}$/.test(trimmed)) {
      setStatus('idle');
      setMessage(null);
      if (resolvedRef.current) emit(null);
      return;
    }
    const ctrl = new AbortController();
    setStatus('resolving');
    setMessage(null);
    const t = setTimeout(() => {
      api.geo
        .resolve(trimmed, ctrl.signal)
        .then((g) => {
          if (ctrl.signal.aborted) return;
          if (g.found && typeof g.lat === 'number' && typeof g.lng === 'number') {
            const lbl = g.city && g.state ? `${g.city}, ${g.state}` : null;
            setStatus('ok');
            setMessage(lbl);
            emit({ coord: { lat: g.lat, lng: g.lng }, label: lbl });
          } else {
            setStatus('notfound');
            setMessage("That ZIP isn't in our supported metros yet — try a supported metro ZIP or enter lat/lng.");
            emit(null);
          }
        })
        .catch((e) => {
          if (ctrl.signal.aborted) return;
          setStatus('error');
          setMessage(errMsg(e));
          emit(null);
        });
    }, 400);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [zip, mode, emit]);

  // Direct lat/lng entry — no fabrication, the user supplies real coordinates.
  useEffect(() => {
    if (mode !== 'coords') return;
    const la = Number(lat);
    const ln = Number(lng);
    const ok =
      lat.trim() !== '' &&
      lng.trim() !== '' &&
      Number.isFinite(la) &&
      Number.isFinite(ln) &&
      Math.abs(la) <= 90 &&
      Math.abs(ln) <= 180;
    if (ok) {
      setStatus('ok');
      setMessage(null);
      emit({ coord: { lat: la, lng: ln }, label: null });
    } else {
      setStatus(lat || lng ? 'error' : 'idle');
      setMessage(lat || lng ? 'Enter a valid latitude (−90…90) and longitude (−180…180).' : null);
      if (resolvedRef.current) emit(null);
    }
  }, [lat, lng, mode, emit]);

  return (
    <fieldset className="flex flex-col gap-3 rounded-md border border-[color:var(--border)] p-4">
      <legend className="px-1 text-body-sm font-semibold text-text">{label}</legend>
      <SegmentedControl
        ariaLabel={`${label} input mode`}
        size="sm"
        options={[
          { value: 'zip', label: 'ZIP' },
          { value: 'coords', label: 'Lat / Lng' },
        ]}
        value={mode}
        onChange={(v) => {
          setMode(v as 'zip' | 'coords');
          setStatus('idle');
          setMessage(null);
          emit(null);
        }}
      />

      {mode === 'zip' ? (
        <Input
          label={`${label} ZIP`}
          hideLabel
          inputMode="numeric"
          maxLength={5}
          placeholder="e.g. 10001"
          value={zip}
          onChange={(e) => setZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
          prefix={<MapPin size={16} aria-hidden="true" />}
          suffix={
            status === 'resolving' ? (
              <Loader2 size={16} aria-hidden="true" className="animate-spin text-text-faint" />
            ) : status === 'ok' ? (
              <CheckCircle2 size={16} aria-hidden="true" className="text-[color:var(--success)]" />
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Input
            label="Latitude"
            inputMode="decimal"
            placeholder="40.7128"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
          />
          <Input
            label="Longitude"
            inputMode="decimal"
            placeholder="-74.0060"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
          />
        </div>
      )}

      {message && (
        <p
          className={
            status === 'ok'
              ? 'flex items-center gap-1.5 text-body-sm text-[color:var(--success)]'
              : status === 'notfound'
                ? 'flex items-start gap-1.5 text-body-sm text-[color:var(--warn)]'
                : 'flex items-start gap-1.5 text-body-sm text-[color:var(--danger)]'
          }
        >
          {status === 'ok' ? (
            <CheckCircle2 size={15} aria-hidden="true" className="mt-0.5 shrink-0" />
          ) : (
            <AlertTriangle size={15} aria-hidden="true" className="mt-0.5 shrink-0" />
          )}
          {message}
        </p>
      )}
    </fieldset>
  );
}

export function Distance() {
  const [origin, setOrigin] = useState<Resolved | null>(null);
  const [dest, setDest] = useState<Resolved | null>(null);

  const [seedKey, setSeedKey] = useState(0);
  const [seedOrigin, setSeedOrigin] = useState<string | null>(null);
  const [seedDest, setSeedDest] = useState<string | null>(null);

  const [result, setResult] = useState<DistanceFuelResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onOrigin = useCallback((r: Resolved | null) => setOrigin(r), []);
  const onDest = useCallback((r: Resolved | null) => setDest(r), []);

  const oc = origin?.coord;
  const dc = dest?.coord;
  const sig = oc && dc ? `${oc.lat},${oc.lng}|${dc.lat},${dc.lng}` : '';

  useEffect(() => {
    if (!oc || !dc) {
      setResult(null);
      setError(null);
      setLoading(false);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    const t = setTimeout(() => {
      api.calc
        .distanceFuel(oc, dc, ctrl.signal)
        .then((r) => {
          if (ctrl.signal.aborted) return;
          setResult(r);
          setError(null);
        })
        .catch((e) => {
          if (ctrl.signal.aborted) return;
          setError(errMsg(e));
          setResult(null);
        })
        .finally(() => {
          if (!ctrl.signal.aborted) setLoading(false);
        });
    }, 350);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  const loadSample = () => {
    setSeedOrigin('10001');
    setSeedDest('30301');
    setSeedKey((n) => n + 1);
  };

  const usd = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="container-mp py-12 md:py-20">
      <header className="flex flex-col gap-3">
        <Eyebrow>Distance + fuel</Eyebrow>
        <h1 className="font-display text-h2 font-medium text-text">
          Real driving miles and fuel for your lane.
        </h1>
        <p className="max-w-prose text-body-lg text-text-muted">
          Enter two ZIPs — we resolve them to federal ZIP-3 centroid coordinates, then compute driving
          distance and fuel cost server-side. No metro on file? Drop in a lat/lng.
        </p>
      </header>

      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.1fr]">
        {/* ---------------- INPUTS (left) ---------------- */}
        <Card padding="lg" className="rounded-xl">
          <div className="flex flex-col gap-4">
            <EndpointField label="Origin" seedZip={seedOrigin} seedKey={seedKey} onResolved={onOrigin} />
            <EndpointField label="Destination" seedZip={seedDest} seedKey={seedKey} onResolved={onDest} />

            {!origin && !dest && (
              <div className="flex items-center justify-between gap-3 rounded-md border border-[color:var(--border)] bg-surface-sunk px-4 py-3">
                <p className="flex items-center gap-2 text-body-sm text-text-muted">
                  <Navigation size={18} aria-hidden="true" className="text-text-faint" />
                  Try a sample lane to see it work.
                </p>
                <Button variant="secondary" size="sm" onClick={loadSample}>
                  Load a sample route
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* ---------------- READOUT (right) ---------------- */}
        <Card padding="lg" className="rounded-xl lg:sticky lg:top-20 lg:self-start">
          <div className="flex flex-col gap-6">
            {/* Route-line arc */}
            <div className="flex flex-col gap-2">
              <div aria-hidden="true" className="px-2">
                <RouteLine className="h-24" animate={Boolean(result)} />
              </div>
              <div className="flex items-center justify-between text-body-sm">
                <span className="flex items-center gap-1.5 font-medium text-text">
                  <span className="h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
                  {origin?.label ?? (oc ? `${oc.lat.toFixed(2)}, ${oc.lng.toFixed(2)}` : 'Origin')}
                </span>
                <span className="flex items-center gap-1.5 font-medium text-text">
                  {dest?.label ?? (dc ? `${dc.lat.toFixed(2)}, ${dc.lng.toFixed(2)}` : 'Destination')}
                  <span className="h-2 w-2 rounded-full border-2 border-copper" aria-hidden="true" />
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatTile
                label="Driving miles"
                value={result?.driving_miles ?? null}
                loading={loading && !result}
                unit="mi"
                emptyNote={!oc || !dc ? 'Resolve both points' : undefined}
              />
              <StatTile
                label="Fuel"
                value={result?.gallons ?? null}
                loading={loading && !result}
                format={(n) => n.toFixed(3)}
                unit="gal"
              />
              <StatTile
                label="Fuel cost"
                value={result?.fuel_cost_usd ?? null}
                loading={loading && !result}
                prefix="$"
                format={(n) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              />
            </div>

            {error && (
              <p className="flex items-center gap-2 rounded-md border border-[color:var(--danger)]/35 bg-[color:var(--danger)]/10 px-3 py-2 text-body-sm text-[color:var(--danger)]">
                <AlertTriangle size={16} aria-hidden="true" />
                {error}
              </p>
            )}

            {/* Constants footnote (transparency) */}
            {result && (
              <dl className="grid grid-cols-3 gap-3 border-t border-[color:var(--border)] pt-4 text-body-sm">
                <div className="flex flex-col">
                  <dt className="text-caption text-text-faint">Efficiency</dt>
                  <dd className="tabular font-medium text-text">{result.constants.mpg} mpg</dd>
                </div>
                <div className="flex flex-col">
                  <dt className="text-caption text-text-faint">Fuel price</dt>
                  <dd className="tabular font-medium text-text">{usd(result.constants.fuel_price_usd_per_gal)}/gal</dd>
                </div>
                <div className="flex flex-col">
                  <dt className="text-caption text-text-faint">Circuity</dt>
                  <dd className="tabular font-medium text-text">×{result.constants.circuity}</dd>
                </div>
              </dl>
            )}
            {result && (
              <p className="tabular text-caption text-text-faint">
                Great-circle {result.great_circle_miles.toLocaleString('en-US')} mi · driving distance
                applies the circuity factor above.
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
