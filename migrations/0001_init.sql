-- migrations/0001_init.sql

PRAGMA foreign_keys = ON;

-- Registered users
CREATE TABLE users (
  id                 TEXT PRIMARY KEY,              -- crypto.randomUUID()
  email              TEXT NOT NULL UNIQUE,
  email_lower        TEXT NOT NULL UNIQUE,          -- lowercased for lookup
  password_hash      TEXT NOT NULL,                 -- "pbkdf2$<iterations>$<saltB64>$<hashB64>"
  is_premium         INTEGER NOT NULL DEFAULT 0,
  premium_purchased_at TEXT,
  premium_amount_cents INTEGER,                     -- 1999..2999
  is_admin           INTEGER NOT NULL DEFAULT 0,
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL
);

-- Anonymous sessions AND registered auth tokens share this table.
-- user_id NULL => anonymous session; user_id set => authenticated token.
CREATE TABLE sessions (
  id                 TEXT PRIMARY KEY,              -- crypto.randomUUID()
  token_hash         TEXT NOT NULL UNIQUE,          -- SHA-256 of the opaque bearer token
  user_id            TEXT REFERENCES users(id) ON DELETE CASCADE,
  upgraded_to_user_id TEXT REFERENCES users(id) ON DELETE SET NULL, -- set when an anon session is upgraded
  created_at         TEXT NOT NULL,
  last_seen_at       TEXT NOT NULL,
  revoked_at         TEXT
);
CREATE INDEX idx_sessions_user ON sessions(user_id);

-- Saved inventory states. Owned by EITHER a session (anon) or a user.
CREATE TABLE inventory_states (
  id                 TEXT PRIMARY KEY,
  owner_type         TEXT NOT NULL CHECK (owner_type IN ('session','user')),
  owner_id           TEXT NOT NULL,                 -- sessions.id or users.id
  name               TEXT NOT NULL,
  items_json         TEXT NOT NULL,                 -- JSON array: [{"key":"sofa","label":"Sofa","quantity":2,"volume_cuft":45.0}]
  total_cuft         REAL NOT NULL,
  total_cbm          REAL NOT NULL,
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL
);
CREATE INDEX idx_inventory_owner ON inventory_states(owner_type, owner_id);

-- Generated timelines
CREATE TABLE timelines (
  id                 TEXT PRIMARY KEY,
  user_id            TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  move_date          TEXT NOT NULL,                 -- ISO date (YYYY-MM-DD)
  origin             TEXT,
  destination        TEXT,
  tasks_json         TEXT NOT NULL,                 -- JSON array of {week_offset, due_date, category, title, done, overdue}
  created_at         TEXT NOT NULL
);
CREATE INDEX idx_timelines_user ON timelines(user_id);

-- Relocation Vault quotes (premium). Normalized numeric fields only; no raw PDF bytes.
CREATE TABLE vault_quotes (
  id                 TEXT PRIMARY KEY,
  user_id            TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mover_name         TEXT NOT NULL,
  mover_usdot        TEXT,                          -- optional, links to FMCSA lookup
  quoted_price_cents INTEGER,
  quoted_weight_lbs  REAL,
  quoted_volume_cuft REAL,
  implied_density    REAL,                          -- computed, nullable if inputs incomplete
  is_anomalous       INTEGER NOT NULL DEFAULT 0,
  anomaly_reason     TEXT,
  extracted_text     TEXT,                          -- optional client-extracted PDF text
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL
);
CREATE INDEX idx_vault_user ON vault_quotes(user_id);

-- SMS deadline alerts (premium)
CREATE TABLE alerts (
  id                 TEXT PRIMARY KEY,
  user_id            TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  timeline_id        TEXT REFERENCES timelines(id) ON DELETE SET NULL,
  task_title         TEXT NOT NULL,
  phone              TEXT NOT NULL,                 -- stored only for premium alert dispatch
  send_at            TEXT NOT NULL,                 -- ISO datetime
  status             TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','sent','failed','cancelled')),
  created_at         TEXT NOT NULL
);
CREATE INDEX idx_alerts_user ON alerts(user_id);

-- Affiliate click log
CREATE TABLE affiliate_clicks (
  id                 TEXT PRIMARY KEY,
  click_id           TEXT NOT NULL,                 -- generated tracking id passed to partner
  partner            TEXT NOT NULL,                 -- 'hireahelper' | 'packaging' | 'utility' | 'truck'
  target_url         TEXT NOT NULL,
  route_context      TEXT,                          -- e.g. "chicago-il_austin-tx" or "box-calculator"
  owner_type         TEXT,                          -- 'session' | 'user' | null
  owner_id           TEXT,
  created_at         TEXT NOT NULL
);
CREATE INDEX idx_clicks_partner ON affiliate_clicks(partner, created_at);

-- FMCSA ingest run log (admin health)
CREATE TABLE ingest_log (
  id                 TEXT PRIMARY KEY,
  source             TEXT NOT NULL,                 -- 'fmcsa_safer'
  run_at             TEXT NOT NULL,
  records_processed  INTEGER NOT NULL DEFAULT 0,
  errors             INTEGER NOT NULL DEFAULT 0,
  status             TEXT NOT NULL CHECK (status IN ('queued','running','success','partial','failed')),
  detail             TEXT
);

-- Third-party API usage meter (admin cost monitoring)
CREATE TABLE api_usage (
  id                 TEXT PRIMARY KEY,
  provider           TEXT NOT NULL,                 -- 'ncoalink' | 'fmcsa' | 'hireahelper' | 'sms'
  day                TEXT NOT NULL,                 -- YYYY-MM-DD
  calls              INTEGER NOT NULL DEFAULT 0,
  cost_cents         INTEGER NOT NULL DEFAULT 0,
  UNIQUE(provider, day)
);

-- Programmatic city-pair route rows
CREATE TABLE route_pages (
  id                 TEXT PRIMARY KEY,              -- slug: "chicago-il_austin-tx"
  origin_city        TEXT NOT NULL,
  origin_state       TEXT NOT NULL,
  origin_lat         REAL NOT NULL,
  origin_lng         REAL NOT NULL,
  dest_city          TEXT NOT NULL,
  dest_state         TEXT NOT NULL,
  dest_lat           REAL NOT NULL,
  dest_lng           REAL NOT NULL,
  distance_miles     REAL NOT NULL,
  fuel_cost_usd      REAL NOT NULL,
  origin_carrier_count INTEGER NOT NULL DEFAULT 0,   -- FMCSA-authorized carriers HQ'd in origin_state (seed-provided fixed value in v1)
  dest_carrier_count   INTEGER NOT NULL DEFAULT 0,   -- FMCSA-authorized carriers HQ'd in dest_state (seed-provided fixed value in v1)
  noindex            INTEGER NOT NULL DEFAULT 0,
  noindex_reason     TEXT,
  generated_at       TEXT NOT NULL
);
CREATE INDEX idx_routes_noindex ON route_pages(noindex);
