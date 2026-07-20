-- migrations/0002_seed.sql
-- Seed data (SPEC §4.2).
--
-- 1) One admin user. Plaintext password for LOCAL DEV ONLY is "ChangeMe!Admin1"
--    (documented in README). The password_hash below is a REAL precomputed
--    PBKDF2-SHA256 hash produced by scripts/hash-password.js in the format
--    "pbkdf2$<iterations>$<saltB64>$<hashB64>"; it verifies via auth.verifyPassword().
-- 2) Five route_pages rows. distance_miles / fuel_cost_usd are computed with the
--    §6.4 formulas (R=3958.8, circuity=1.2, MPG=10, fuel=$3.50; driving is derived
--    from the UNROUNDED great-circle value, then fuel uses the rounded driving).
--    origin_carrier_count / dest_carrier_count are FIXED v1 seed values (any positive
--    integers; not derived from a live per-state index). The final rural pair is
--    deliberately empty (0/0) and flagged noindex.

INSERT INTO users (
  id, email, email_lower, password_hash,
  is_premium, premium_purchased_at, premium_amount_cents,
  is_admin, created_at, updated_at
) VALUES (
  'a0000000-0000-4000-8000-000000000001',
  'admin@movepilot.local',
  'admin@movepilot.local',
  'pbkdf2$100000$biwa5LGPMaXBZSQttavPWw==$fipt/v3Xd9O6In/Vya7r83Pz0h4ZUZrAVqNV/v2v9Jc=',
  0, NULL, NULL,
  1, '2026-07-19T00:00:00.000Z', '2026-07-19T00:00:00.000Z'
);

-- Chicago, IL -> Austin, TX
INSERT INTO route_pages (
  id, origin_city, origin_state, origin_lat, origin_lng,
  dest_city, dest_state, dest_lat, dest_lng,
  distance_miles, fuel_cost_usd, origin_carrier_count, dest_carrier_count,
  noindex, noindex_reason, generated_at
) VALUES (
  'chicago-il_austin-tx', 'Chicago', 'IL', 41.8781, -87.6298,
  'Austin', 'TX', 30.2672, -97.7431,
  1175.43, 411.40, 320, 210,
  0, NULL, '2026-07-19T00:00:00.000Z'
);

-- Los Angeles, CA -> New York, NY
INSERT INTO route_pages (
  id, origin_city, origin_state, origin_lat, origin_lng,
  dest_city, dest_state, dest_lat, dest_lng,
  distance_miles, fuel_cost_usd, origin_carrier_count, dest_carrier_count,
  noindex, noindex_reason, generated_at
) VALUES (
  'los-angeles-ca_new-york-ny', 'Los Angeles', 'CA', 34.0522, -118.2437,
  'New York', 'NY', 40.7128, -74.0060,
  2934.70, 1027.15, 540, 480,
  0, NULL, '2026-07-19T00:00:00.000Z'
);

-- Seattle, WA -> Denver, CO
INSERT INTO route_pages (
  id, origin_city, origin_state, origin_lat, origin_lng,
  dest_city, dest_state, dest_lat, dest_lng,
  distance_miles, fuel_cost_usd, origin_carrier_count, dest_carrier_count,
  noindex, noindex_reason, generated_at
) VALUES (
  'seattle-wa_denver-co', 'Seattle', 'WA', 47.6062, -122.3321,
  'Denver', 'CO', 39.7392, -104.9903,
  1223.42, 428.20, 190, 165,
  0, NULL, '2026-07-19T00:00:00.000Z'
);

-- Miami, FL -> Atlanta, GA
INSERT INTO route_pages (
  id, origin_city, origin_state, origin_lat, origin_lng,
  dest_city, dest_state, dest_lat, dest_lng,
  distance_miles, fuel_cost_usd, origin_carrier_count, dest_carrier_count,
  noindex, noindex_reason, generated_at
) VALUES (
  'miami-fl_atlanta-ga', 'Miami', 'FL', 25.7617, -80.1918,
  'Atlanta', 'GA', 33.7490, -84.3880,
  727.67, 254.68, 275, 240,
  0, NULL, '2026-07-19T00:00:00.000Z'
);

-- Deliberately empty rural pair: zero authorized carriers -> noindex.
INSERT INTO route_pages (
  id, origin_city, origin_state, origin_lat, origin_lng,
  dest_city, dest_state, dest_lat, dest_lng,
  distance_miles, fuel_cost_usd, origin_carrier_count, dest_carrier_count,
  noindex, noindex_reason, generated_at
) VALUES (
  'lost-springs-wy_monowi-ne', 'Lost Springs', 'WY', 42.7625, -104.9211,
  'Monowi', 'NE', 42.8305, -98.3290,
  400.99, 140.35, 0, 0,
  1, 'zero_authorized_carriers', '2026-07-19T00:00:00.000Z'
);
