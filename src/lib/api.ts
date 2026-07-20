/**
 * MovePilot API client — typed fetch wrapper for the same-origin /api/* contract.
 *
 * Envelope (backend §5):   success -> { ok:true,  data:{...} }
 *                          error   -> { ok:false, error:{ code, message } }
 *
 * ZERO mock data: every method performs a real fetch. Failures throw `ApiError`
 * (with the backend error `code`) so components render their documented
 * loading / empty / error states — never a fabricated number.
 *
 * Auth: pass `auth: true` (or a token string) to attach `Authorization: Bearer`.
 * The active bearer (anon session token or user auth token) is held in memory and
 * mirrored to localStorage by the token helpers below.
 */

// ---------------------------------------------------------------------------
// Error type + codes
// ---------------------------------------------------------------------------

export type ApiErrorCode =
  | 'VALIDATION'
  | 'UNAUTHENTICATED'
  | 'PREMIUM_REQUIRED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL'
  | 'UPSTREAM'
  | 'UNRESOLVED_LOCATION'
  | 'NETWORK';

export class ApiError extends Error {
  code: ApiErrorCode | string;
  status: number;
  constructor(code: ApiErrorCode | string, message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

// ---------------------------------------------------------------------------
// Token storage (memory + localStorage mirror)
// ---------------------------------------------------------------------------

const TOKEN_KEY = 'mp-auth-token';
const PREMIUM_KEY = 'mp-is-premium';

let bearer: string | null = readStored(TOKEN_KEY);

function readStored(key: string): string | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  bearer = token;
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore storage failures (private mode, etc.) */
  }
}

export function getAuthToken(): string | null {
  return bearer;
}

export function setPremium(isPremium: boolean): void {
  try {
    localStorage.setItem(PREMIUM_KEY, isPremium ? '1' : '0');
  } catch {
    /* ignore */
  }
}

export function getPremium(): boolean {
  return readStored(PREMIUM_KEY) === '1';
}

// ---------------------------------------------------------------------------
// Core fetch
// ---------------------------------------------------------------------------

type Envelope<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };

export interface ApiFetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  /** true -> attach the stored bearer; a string -> attach that token. */
  auth?: boolean | string;
  query?: Record<string, string | number | boolean | undefined | null>;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: ApiFetchOptions['query']): string {
  const base = path.startsWith('/api') ? path : `/api${path.startsWith('/') ? '' : '/'}${path}`;
  if (!query) return base;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null) qs.append(k, String(v));
  }
  const s = qs.toString();
  return s ? `${base}?${s}` : base;
}

/**
 * The single low-level request used by every typed method. Parses the
 * `{ ok, data, error }` envelope, throws typed ApiError on failure.
 */
export async function apiFetch<T>(path: string, opts: ApiFetchOptions = {}): Promise<T> {
  const { method = 'GET', body, auth, query, signal } = opts;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const token = auth === true ? bearer : typeof auth === 'string' ? auth : null;
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') throw e;
    throw new ApiError('NETWORK', 'Network request failed', 0);
  }

  let json: Envelope<T> | null = null;
  try {
    json = (await res.json()) as Envelope<T>;
  } catch {
    // Non-JSON body (e.g. an HTML error page). Surface a typed error.
    if (!res.ok) throw new ApiError('INTERNAL', `Request failed (${res.status})`, res.status);
    throw new ApiError('INTERNAL', 'Malformed response', res.status);
  }

  if (json && json.ok) return json.data;

  const code = json && !json.ok ? json.error.code : 'INTERNAL';
  const message =
    json && !json.ok ? json.error.message : `Request failed (${res.status})`;
  throw new ApiError(code, message, res.status);
}

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface LatLng {
  lat: number;
  lng: number;
}
export interface ZipRef {
  zip: string;
}
export type LocationInput = LatLng | ZipRef;

export type BedroomKey = 'studio' | 'one' | 'two' | 'three' | 'four';
export type BoxKey = 'small' | 'medium' | 'large';

export interface VolumeItemInput {
  key?: string;
  label?: string;
  quantity: number;
  volume_cuft?: number;
}

export interface VolumeLineItem {
  key: string;
  label: string;
  quantity: number;
  volume_cuft: number;
  subtotal_cuft: number;
}
export interface VolumeResult {
  total_cuft: number;
  total_cbm: number;
  line_items: VolumeLineItem[];
}

export interface DimWeightResult {
  cubic_inches: number;
  divisor: number;
  dimensional_weight_lbs: number;
}

export interface BoxesResult {
  bedrooms: number;
  boxes: { small: number; medium: number; large: number };
  total_box_volume_cuft: number;
}

export interface DistanceFuelResult {
  great_circle_miles: number;
  driving_miles: number;
  gallons: number;
  fuel_cost_usd: number;
  constants: { mpg: number; fuel_price_usd_per_gal: number; circuity: number };
}

export interface QuoteAnomalyResult {
  implied_density: number;
  baseline: number;
  lower_bound: number;
  upper_bound: number;
  deviation_pct: number;
  is_anomalous: boolean;
  reason: string;
}

export interface EstimateResult {
  total_cuft: number;
  est_weight_lbs: number;
  distance_miles: number;
  fuel_cost_usd: number;
  cost_low_usd: number;
  cost_high_usd: number;
  full_service_mid_usd: number;
  recommendation: 'full_service' | 'diy';
  recommendation_text: string;
  origin: { lat: number; lng: number; city?: string; state?: string };
  destination: { lat: number; lng: number; city?: string; state?: string };
}

export interface GeoResolveResult {
  found: boolean;
  zip: string;
  zip3?: string;
  lat?: number;
  lng?: number;
  city?: string;
  state?: string;
}

export interface CatalogItem {
  key: string;
  label: string;
  volume_cuft: number;
}
export interface BedroomPreset {
  cuft: number;
  items: string[];
}
export interface CatalogResult {
  items: CatalogItem[];
  bedroom_presets: Record<BedroomKey, BedroomPreset>;
}

export interface FmcsaFound {
  found: true;
  carrier_name: string;
  usdot: string;
  mc: string;
  operating_status: string;
  authorized_for_hhg: boolean;
  insurance_on_file_usd: number;
  meets_750k_minimum: boolean;
  crash_total: number;
  inspection_total: number;
  plain_english: string[];
  source: string;
  fetched_at: string;
}
export interface FmcsaNotFound {
  found: false;
  reason: string;
  source: string;
  fetched_at: string;
}
export type FmcsaResult = FmcsaFound | FmcsaNotFound;

export interface AddressStandardizeResult {
  standardized: { street: string; city: string; state: string; zip: string; zip4?: string };
  provider: 'ncoalink' | 'fallback';
  utility_checklist: { category: string; task: string }[];
}

export interface AnonSession {
  session_token: string;
  session_id: string;
}
export interface RegisterResult {
  user_id: string;
  auth_token: string;
}
export interface LoginResult {
  user_id: string;
  auth_token: string;
  is_premium: boolean;
}
export interface UpgradeResult {
  user_id: string;
  auth_token: string;
  inventory_migrated: number;
}

export interface InventorySummary {
  id: string;
  name: string;
  total_cuft: number;
  total_cbm: number;
  updated_at: string;
}
export interface InventoryDetail extends InventorySummary {
  items: VolumeItemInput[];
}
export interface InventorySaveResult {
  id: string;
  total_cuft: number;
  total_cbm: number;
}

export interface TimelineTask {
  week_offset: number;
  due_date: string;
  category: string;
  title: string;
  done: boolean;
  overdue: boolean;
}
export interface Timeline {
  id: string;
  move_date: string;
  tasks: TimelineTask[];
}

export interface VaultQuote {
  id: string;
  mover_name: string;
  mover_usdot?: string;
  quoted_price_usd?: number;
  quoted_weight_lbs?: number;
  quoted_volume_cuft?: number;
  implied_density?: number;
  is_anomalous: boolean;
  anomaly_reason?: string;
}
export interface VaultQuoteInput {
  mover_name: string;
  mover_usdot?: string;
  quoted_price_usd?: number;
  quoted_weight_lbs?: number;
  quoted_volume_cuft?: number;
  extracted_text?: string;
}
export interface ScenarioLineItem {
  label: string;
  amount_usd: number;
}
export interface Scenario {
  name: string;
  line_items: ScenarioLineItem[];
  total_usd: number;
}
export interface ScenarioResult {
  scenarios: Scenario[];
  ranked: string[];
}
export interface VaultAlert {
  id: string;
  timeline_id?: string;
  task_title: string;
  send_at: string;
  status: 'scheduled' | 'sent' | 'failed' | 'cancelled';
  created_at: string;
}
export interface VaultAlertInput {
  timeline_id?: string;
  task_title: string;
  phone: string;
  send_at: string;
}

export interface PremiumPurchaseResult {
  is_premium: true;
  premium_purchased_at: string;
}

export interface AffiliateClickResult {
  click_id: string;
  redirect_url: string;
}
export type AffiliatePartner = 'hireahelper' | 'packaging' | 'utility' | 'truck';
export interface AdSlot {
  id: string;
  placement: string;
  enabled: boolean;
  size: string;
}
export interface AdSlotsResult {
  slots: AdSlot[];
}

export interface RouteSummary {
  origin: { city: string; state: string; lat: number; lng: number };
  destination: { city: string; state: string; lat: number; lng: number };
  distance_miles: number;
  fuel_cost_usd: number;
  origin_carrier_count: number;
  dest_carrier_count: number;
  noindex: boolean;
  noindex_reason?: string;
}

export interface AdminIngestHealth {
  runs: Array<Record<string, unknown>>;
}
export interface AdminApiUsage {
  usage: Array<{ provider: string; day: string; calls: number; cost_cents: number }>;
  totals: Record<string, unknown>;
}
export interface AdminNoindexAudit {
  routes: Array<{
    id: string;
    noindex: boolean;
    noindex_reason?: string;
    origin_carrier_count: number;
    dest_carrier_count: number;
  }>;
}
export interface AdminIngestTriggerResult {
  ingest_run_id: string;
  enqueued: number;
}

// ---------------------------------------------------------------------------
// Typed method surface — one namespace per API area
// ---------------------------------------------------------------------------

export const api = {
  // --- Calculators (no auth) ---
  calc: {
    volume: (items: VolumeItemInput[], signal?: AbortSignal) =>
      apiFetch<VolumeResult>('/api/calc/volume', { method: 'POST', body: { items }, signal }),
    dimensionalWeight: (
      body: { length_in: number; width_in: number; height_in: number; divisor?: 139 | 166 | 194 },
      signal?: AbortSignal,
    ) => apiFetch<DimWeightResult>('/api/calc/dimensional-weight', { method: 'POST', body, signal }),
    boxes: (bedrooms: number, signal?: AbortSignal) =>
      apiFetch<BoxesResult>('/api/calc/boxes', { method: 'POST', body: { bedrooms }, signal }),
    distanceFuel: (origin: LatLng, destination: LatLng, signal?: AbortSignal) =>
      apiFetch<DistanceFuelResult>('/api/calc/distance-fuel', {
        method: 'POST',
        body: { origin, destination },
        signal,
      }),
    quoteAnomaly: (
      body: { quoted_weight_lbs: number; quoted_volume_cuft: number },
      signal?: AbortSignal,
    ) => apiFetch<QuoteAnomalyResult>('/api/calc/quote-anomaly', { method: 'POST', body, signal }),
    estimate: (
      body: {
        bedrooms?: BedroomKey;
        total_cuft?: number;
        origin: LocationInput;
        destination: LocationInput;
      },
      signal?: AbortSignal,
    ) => apiFetch<EstimateResult>('/api/calc/estimate', { method: 'POST', body, signal }),
  },

  // --- Geo + catalog (no auth) ---
  geo: {
    resolve: (zip: string, signal?: AbortSignal) =>
      apiFetch<GeoResolveResult>('/api/geo/resolve', { query: { zip }, signal }),
  },
  catalog: {
    items: (signal?: AbortSignal) => apiFetch<CatalogResult>('/api/catalog/items', { signal }),
  },

  // --- FMCSA (no auth) ---
  fmcsa: {
    lookup: (params: { usdot?: string | number; mc?: string | number }, signal?: AbortSignal) =>
      apiFetch<FmcsaResult>('/api/fmcsa/lookup', {
        query: { usdot: params.usdot, mc: params.mc },
        signal,
      }),
  },

  // --- Address / NCOA (no auth) ---
  address: {
    standardize: (
      body: { street: string; city: string; state: string; zip: string },
      signal?: AbortSignal,
    ) =>
      apiFetch<AddressStandardizeResult>('/api/address/standardize', {
        method: 'POST',
        body,
        signal,
      }),
  },

  // --- Auth & sessions ---
  session: {
    anon: () => apiFetch<AnonSession>('/api/session/anon', { method: 'POST', body: {} }),
    upgrade: (body: { email: string; password: string }) =>
      apiFetch<UpgradeResult>('/api/session/upgrade', { method: 'POST', body, auth: true }),
  },
  auth: {
    register: (body: { email: string; password: string }) =>
      apiFetch<RegisterResult>('/api/auth/register', { method: 'POST', body }),
    login: (body: { email: string; password: string }) =>
      apiFetch<LoginResult>('/api/auth/login', { method: 'POST', body }),
    logout: () => apiFetch<{ revoked: boolean }>('/api/auth/logout', { method: 'POST', body: {}, auth: true }),
  },

  // --- Inventory (Bearer: registered or anon session) ---
  inventory: {
    save: (body: { name: string; items: VolumeItemInput[] }) =>
      apiFetch<InventorySaveResult>('/api/inventory/save', { method: 'POST', body, auth: true }),
    list: () => apiFetch<{ items: InventorySummary[] }>('/api/inventory/list', { auth: true }),
    get: (id: string) => apiFetch<InventoryDetail>(`/api/inventory/${id}`, { auth: true }),
    update: (id: string, body: { name?: string; items?: VolumeItemInput[] }) =>
      apiFetch<InventorySaveResult>(`/api/inventory/${id}`, { method: 'PUT', body, auth: true }),
    remove: (id: string) =>
      apiFetch<{ deleted: boolean }>(`/api/inventory/${id}`, { method: 'DELETE', auth: true }),
  },

  // --- Timeline (Bearer: user) ---
  timeline: {
    generate: (body: { move_date: string; origin?: string; destination?: string }) =>
      apiFetch<Timeline>('/api/timeline/generate', { method: 'POST', body, auth: true }),
    get: (id: string) => apiFetch<Timeline>(`/api/timeline/${id}`, { auth: true }),
  },

  // --- Vault (PREMIUM-gated; 402 -> preview-with-sample-data) ---
  vault: {
    listQuotes: () => apiFetch<{ quotes: VaultQuote[] }>('/api/vault/quotes', { auth: true }),
    createQuote: (body: VaultQuoteInput) =>
      apiFetch<VaultQuote>('/api/vault/quotes', { method: 'POST', body, auth: true }),
    getQuote: (id: string) => apiFetch<VaultQuote>(`/api/vault/quotes/${id}`, { auth: true }),
    updateQuote: (id: string, body: Partial<VaultQuoteInput>) =>
      apiFetch<VaultQuote>(`/api/vault/quotes/${id}`, { method: 'PUT', body, auth: true }),
    removeQuote: (id: string) =>
      apiFetch<{ deleted: boolean }>(`/api/vault/quotes/${id}`, { method: 'DELETE', auth: true }),
    scenario: (body: { distance_miles: number; labor_hours: number; weight_lbs: number }) =>
      apiFetch<ScenarioResult>('/api/vault/scenario', { method: 'POST', body, auth: true }),
    listAlerts: () => apiFetch<{ alerts: VaultAlert[] }>('/api/vault/alerts', { auth: true }),
    createAlert: (body: VaultAlertInput) =>
      apiFetch<{ alert_id: string; status: 'scheduled' }>('/api/vault/alerts', {
        method: 'POST',
        body,
        auth: true,
      }),
  },

  // --- Premium purchase (Bearer: user) ---
  premium: {
    purchase: (amount_usd: number) =>
      apiFetch<PremiumPurchaseResult>('/api/premium/purchase', {
        method: 'POST',
        body: { amount_usd },
        auth: true,
      }),
  },

  // --- Affiliate & ad config ---
  affiliate: {
    click: (body: { partner: AffiliatePartner; context?: string }) =>
      apiFetch<AffiliateClickResult>('/api/affiliate/click', { method: 'POST', body }),
    /** Plain-navigation href for the logging redirect (use as <a href>). */
    goHref: (partner: AffiliatePartner, context?: string) =>
      buildUrl('/api/affiliate/go', { partner, context }),
  },
  config: {
    adSlots: (signal?: AbortSignal) => apiFetch<AdSlotsResult>('/api/config/ad-slots', { signal }),
  },

  // --- Routes (programmatic, no auth) ---
  routes: {
    get: (slug: string, signal?: AbortSignal) =>
      apiFetch<RouteSummary>(`/api/routes/${slug}`, { signal }),
  },

  // --- Admin (Bearer: ADMIN_API_KEY or is_admin) ---
  admin: {
    ingestHealth: (limit?: number) =>
      apiFetch<AdminIngestHealth>('/api/admin/ingest-health', { query: { limit }, auth: true }),
    apiUsage: (from?: string, to?: string) =>
      apiFetch<AdminApiUsage>('/api/admin/api-usage', { query: { from, to }, auth: true }),
    noindexAudit: () => apiFetch<AdminNoindexAudit>('/api/admin/noindex-audit', { auth: true }),
    triggerIngest: (usdots: string[]) =>
      apiFetch<AdminIngestTriggerResult>('/api/admin/ingest/trigger', {
        method: 'POST',
        body: { usdots },
        auth: true,
      }),
  },
};

export type Api = typeof api;
