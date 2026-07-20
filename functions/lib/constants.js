// functions/lib/constants.js
// ALL fixed business constants from SPEC §6. These are the single source of truth
// on the server; the same numeric values are mirrored into KV via seed/*.json so
// calculators can read them edge-local. Nothing here is tunable at runtime — every
// value is a documented, fixed constant so responses are deterministic (§1 principle 2).

// --- §6.1 Inventory → Volume ---
export const CBM_PER_CUFT = 0.0283168; // cubic-feet → cubic-meters conversion factor

// Box volumes (cu ft). medium is defined as 18"×18"×16".
export const BOX_SIZES = Object.freeze({
  small: 1.5,
  medium: 3.0,
  large: 4.5,
});

// --- §6.2 Dimensional weight ---
// Divisors: 139 (low), 166 (default domestic), 194 (high).
export const DIM_DIVISORS = Object.freeze({
  domestic_default: 166,
  low: 139,
  high: 194,
  air_kg_per_cbm: 167, // international air chargeable weight: kg per CBM
  ocean_kg_per_cbm: 1000, // ocean freight reference constant (no v1 endpoint)
});
export const DEFAULT_DIVISOR = 166;
export const ALLOWED_DIVISORS = Object.freeze([139, 166, 194]);
export const AIR_KG_PER_CBM = 167;
export const OCEAN_KG_PER_CBM = 1000;

// --- §6.3 Box calculator (boxes per bedroom) ---
export const BOX_RATES_PER_BEDROOM = Object.freeze({
  small: 7,
  medium: 11,
  large: 7,
});

// --- §6.4 Distance + theoretical fuel cost ---
export const EARTH_RADIUS_MILES = 3958.8; // R
export const CIRCUITY_FACTOR = 1.2; // road circuity factor (great-circle → driving)
export const TRUCK_MPG = 10; // moving-truck fuel economy
export const FUEL_PRICE_USD_PER_GAL = 3.5;

// --- §6.5 Quote normalization / anomaly detection ---
export const DENSITY_BASELINE = 7.0; // lb/cu ft baseline household-goods density
export const DENSITY_LOWER_BOUND = 5.95; // −15% tolerance
export const DENSITY_UPPER_BOUND = 8.05; // +15% tolerance
export const DENSITY_TOLERANCE_PCT = 15;

// --- §6.6 Multi-scenario cost modeling ---
export const TRUCK_BASE_USD = 40.0;
export const TRUCK_MILEAGE_USD_PER_MI = 1.0;
export const LABOR_RATE_USD_PER_HR = 60.0;
export const CONTAINER_BASE_USD = 200.0;
export const CONTAINER_MILEAGE_USD_PER_MI = 2.5;
export const FULLSERVICE_USD_PER_LB = 0.7;

// --- §7.3 / premium ---
export const PREMIUM_MIN_USD = 19.99;
export const PREMIUM_MAX_USD = 29.99;

// --- FMCSA ---
export const FMCSA_LIABILITY_MINIMUM_USD = 750000; // federal $750k HHG liability minimum
export const FMCSA_KV_TTL_SECONDS = 604800; // 7 days
export const FMCSA_SOURCE = 'FMCSA SAFER';

// --- §12.1 Anonymous move estimate (ADDENDUM) ---
// Canonical bedroom → volume presets (cu ft). Used when the anonymous estimate
// endpoint receives a `bedrooms` size instead of an explicit `total_cuft`.
export const BEDROOM_CUFT = Object.freeze({
  studio: 300,
  one: 450,
  two: 840,
  three: 1300,
  four: 1800,
});
// est weight = round(cuft × 7). Same 7.0 lb/cu ft baseline as quote-anomaly (§6.5).
export const HHG_DENSITY_LB_PER_CUFT = 7.0;
export const FS_BASE_USD_PER_LB = 0.55; // full-service base rate per lb
export const FS_DIST_COEFF = 0.00017; // per-lb add-on per driving mile
export const ESTIMATE_RANGE_PCT = 0.15; // ±15% → cost_low / cost_high
export const FULLSERVICE_MIN_MILES = 150; // >= → recommend full_service, else diy

// --- auth ---
export const PBKDF2_ITERATIONS = 100000;
export const PBKDF2_HASH = 'SHA-256';
export const PBKDF2_KEYLEN_BITS = 256;
