// functions/lib/geo.js
// SPEC §12.6 Geocode resolve. ZIP-3-prefix → centroid lookup, Cloudflare Workers
// runtime only (no Node APIs). Resolution order (§12.3): prefer the edge-local KV
// key `geo:zip3:<prefix>` (seeded by scripts/seed-kv.js from seed/zip3_centroids.json);
// fall back to the STARTER table bundled here so the lib works even before KV is
// seeded (and in unit tests with no KV binding). The bundled table is the exact same
// >=40-metro starter set shipped in seed/zip3_centroids.json — the full ~900-prefix
// table can be dropped into KV later with NO code change.

// Starter ZIP-3 centroids (mirror of seed/zip3_centroids.json). See §12.3 for the
// required cities (NY 100, Atlanta 303, Chicago 606, Austin 787, LA 900, Seattle 981,
// Denver 802, Miami 331) plus ~37 more common metros with plausible centroids.
export const ZIP3_CENTROIDS = Object.freeze({
  '100': { lat: 40.7506, lng: -73.9971, city: 'New York', state: 'NY' },
  '021': { lat: 42.3601, lng: -71.0589, city: 'Boston', state: 'MA' },
  '191': { lat: 39.9526, lng: -75.1652, city: 'Philadelphia', state: 'PA' },
  '200': { lat: 38.9072, lng: -77.0369, city: 'Washington', state: 'DC' },
  '212': { lat: 39.2904, lng: -76.6122, city: 'Baltimore', state: 'MD' },
  '232': { lat: 37.5407, lng: -77.436, city: 'Richmond', state: 'VA' },
  '282': { lat: 35.2271, lng: -80.8431, city: 'Charlotte', state: 'NC' },
  '303': { lat: 33.749, lng: -84.388, city: 'Atlanta', state: 'GA' },
  '322': { lat: 30.3322, lng: -81.6557, city: 'Jacksonville', state: 'FL' },
  '328': { lat: 28.5383, lng: -81.3792, city: 'Orlando', state: 'FL' },
  '331': { lat: 25.7617, lng: -80.1918, city: 'Miami', state: 'FL' },
  '337': { lat: 27.9506, lng: -82.4572, city: 'Tampa', state: 'FL' },
  '372': { lat: 36.1627, lng: -86.7816, city: 'Nashville', state: 'TN' },
  '381': { lat: 35.1495, lng: -90.049, city: 'Memphis', state: 'TN' },
  '402': { lat: 38.2527, lng: -85.7585, city: 'Louisville', state: 'KY' },
  '432': { lat: 39.9612, lng: -82.9988, city: 'Columbus', state: 'OH' },
  '441': { lat: 41.4993, lng: -81.6944, city: 'Cleveland', state: 'OH' },
  '452': { lat: 39.1031, lng: -84.512, city: 'Cincinnati', state: 'OH' },
  '462': { lat: 39.7684, lng: -86.1581, city: 'Indianapolis', state: 'IN' },
  '482': { lat: 42.3314, lng: -83.0458, city: 'Detroit', state: 'MI' },
  '531': { lat: 43.0389, lng: -87.9065, city: 'Milwaukee', state: 'WI' },
  '551': { lat: 44.9778, lng: -93.265, city: 'Minneapolis', state: 'MN' },
  '606': { lat: 41.8781, lng: -87.6298, city: 'Chicago', state: 'IL' },
  '631': { lat: 38.627, lng: -90.1994, city: 'St. Louis', state: 'MO' },
  '641': { lat: 39.0997, lng: -94.5786, city: 'Kansas City', state: 'MO' },
  '681': { lat: 41.2565, lng: -95.9345, city: 'Omaha', state: 'NE' },
  '701': { lat: 29.9511, lng: -90.0715, city: 'New Orleans', state: 'LA' },
  '730': { lat: 35.4676, lng: -97.5164, city: 'Oklahoma City', state: 'OK' },
  '750': { lat: 32.7767, lng: -96.797, city: 'Dallas', state: 'TX' },
  '770': { lat: 29.7604, lng: -95.3698, city: 'Houston', state: 'TX' },
  '782': { lat: 29.4241, lng: -98.4936, city: 'San Antonio', state: 'TX' },
  '787': { lat: 30.2672, lng: -97.7431, city: 'Austin', state: 'TX' },
  '802': { lat: 39.7392, lng: -104.9903, city: 'Denver', state: 'CO' },
  '841': { lat: 40.7608, lng: -111.891, city: 'Salt Lake City', state: 'UT' },
  '850': { lat: 33.4484, lng: -112.074, city: 'Phoenix', state: 'AZ' },
  '857': { lat: 32.2226, lng: -110.9747, city: 'Tucson', state: 'AZ' },
  '870': { lat: 35.0844, lng: -106.6504, city: 'Albuquerque', state: 'NM' },
  '891': { lat: 36.1699, lng: -115.1398, city: 'Las Vegas', state: 'NV' },
  '900': { lat: 34.0522, lng: -118.2437, city: 'Los Angeles', state: 'CA' },
  '921': { lat: 32.7157, lng: -117.1611, city: 'San Diego', state: 'CA' },
  '941': { lat: 37.7749, lng: -122.4194, city: 'San Francisco', state: 'CA' },
  '950': { lat: 37.3382, lng: -121.8863, city: 'San Jose', state: 'CA' },
  '958': { lat: 38.5816, lng: -121.4944, city: 'Sacramento', state: 'CA' },
  '970': { lat: 45.5152, lng: -122.6784, city: 'Portland', state: 'OR' },
  '981': { lat: 47.6062, lng: -122.3321, city: 'Seattle', state: 'WA' },
});

/**
 * Resolve a 5-digit ZIP to its ZIP-3 centroid (§12.6).
 * Returns one of:
 *   - malformed (not exactly 5 digits): { found:false, malformed:true, zip }
 *   - unseeded prefix:                  { found:false, zip }
 *   - hit: { found:true, zip, zip3, lat, lng, city, state }
 * KV (`geo:zip3:<zip3>`) is consulted first, then the bundled starter table.
 * @param {string} zip @param {object} env @returns {Promise<object>}
 */
export async function resolveZip(zip, env) {
  const raw = typeof zip === 'string' ? zip.trim() : zip != null ? String(zip) : '';
  // §12.6: malformed zip (not 5 digits) → not resolvable (handler maps to 400).
  if (!/^\d{5}$/.test(raw)) return { found: false, malformed: true, zip: raw };
  const zip3 = raw.slice(0, 3);

  // Prefer edge-local KV (seeded from seed/zip3_centroids.json); fall back to bundle.
  let centroid = null;
  if (env && env.MP_KV) {
    const kvRaw = await env.MP_KV.get(`geo:zip3:${zip3}`);
    if (kvRaw) {
      try {
        centroid = JSON.parse(kvRaw);
      } catch {
        /* malformed KV value → fall through to bundled table */
      }
    }
  }
  if (!centroid) centroid = ZIP3_CENTROIDS[zip3] || null;
  if (!centroid) return { found: false, zip: raw }; // unseeded prefix (§12.6)

  return {
    found: true,
    zip: raw,
    zip3,
    lat: centroid.lat,
    lng: centroid.lng,
    city: centroid.city,
    state: centroid.state,
  };
}
