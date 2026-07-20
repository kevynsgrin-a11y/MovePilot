// functions/lib/db.js
// D1 query helpers + id/now/today utilities. Cloudflare Workers runtime only:
// ids come from crypto.randomUUID(); time from Date. The D1 binding is env.MP_DB.

/** @returns {string} RFC-4122 v4 UUID (Web Crypto) */
export function id() {
  return crypto.randomUUID();
}

/** @returns {string} current instant as ISO-8601 UTC string */
export function now() {
  return new Date().toISOString();
}

/**
 * Current UTC calendar day as YYYY-MM-DD (used for api_usage.day).
 * @param {Date} [d=new Date()]
 * @returns {string}
 */
export function today(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

/** @param {object} env @returns {D1Database} the MP_DB binding */
export function getDb(env) {
  if (!env || !env.MP_DB) throw new Error('D1 binding MP_DB is not available on env');
  return env.MP_DB;
}

/**
 * Return the first row of a query (or null).
 * @param {object} env @param {string} sql @param {...*} params
 * @returns {Promise<object|null>}
 */
export async function one(env, sql, ...params) {
  return getDb(env).prepare(sql).bind(...params).first();
}

/**
 * Return all rows of a query.
 * @param {object} env @param {string} sql @param {...*} params
 * @returns {Promise<object[]>}
 */
export async function all(env, sql, ...params) {
  const res = await getDb(env).prepare(sql).bind(...params).all();
  return res.results || [];
}

/**
 * Execute a write; returns D1 run result (with .meta).
 * @param {object} env @param {string} sql @param {...*} params
 * @returns {Promise<object>}
 */
export async function run(env, sql, ...params) {
  return getDb(env).prepare(sql).bind(...params).run();
}

/**
 * Build a bound prepared statement (for use in batch()).
 * @param {object} env @param {string} sql @param {...*} params
 * @returns {D1PreparedStatement}
 */
export function stmt(env, sql, ...params) {
  return getDb(env).prepare(sql).bind(...params);
}

/**
 * Run an array of prepared statements atomically.
 * @param {object} env @param {D1PreparedStatement[]} statements
 * @returns {Promise<object[]>}
 */
export async function batch(env, statements) {
  return getDb(env).batch(statements);
}
