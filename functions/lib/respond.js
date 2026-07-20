// functions/lib/respond.js
// JSON response helpers + CORS. SPEC §5 envelope:
//   success → { ok:true,  data:{...} }
//   error   → { ok:false, error:{ code, message } }
// Standard error codes map to fixed HTTP statuses (§5).

export const CORS_HEADERS = Object.freeze({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
});

// SPEC §5 standard error codes → HTTP status.
export const STATUS_BY_CODE = Object.freeze({
  VALIDATION: 400,
  UNAUTHENTICATED: 401,
  PREMIUM_REQUIRED: 402,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL: 500,
  UPSTREAM: 502,
});

/**
 * Typed HTTP error. Handlers/lib throw this; `_middleware.js` (and errorResponse)
 * converts it to the §5 error envelope. Status is derived from the code unless
 * explicitly overridden.
 */
export class HttpError extends Error {
  /**
   * @param {string} code   one of STATUS_BY_CODE keys
   * @param {string} message human-readable message
   * @param {number} [status] optional explicit status override
   */
  constructor(code, message, status) {
    super(message);
    this.name = 'HttpError';
    this.code = code;
    this.status = status ?? STATUS_BY_CODE[code] ?? 500;
  }
}

function jsonResponse(bodyObj, status, extraHeaders) {
  return new Response(JSON.stringify(bodyObj), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS, ...(extraHeaders || {}) },
  });
}

/**
 * Success envelope. @param {*} data @param {number} [status=200]
 * @returns {Response}
 */
export function ok(data, status = 200, extraHeaders) {
  return jsonResponse({ ok: true, data }, status, extraHeaders);
}

/**
 * Error envelope. @param {string} code @param {string} message
 * @param {number} [status] override (else derived from code)
 * @returns {Response}
 */
export function err(code, message, status, extraHeaders) {
  const resolved = status ?? STATUS_BY_CODE[code] ?? 500;
  return jsonResponse({ ok: false, error: { code, message } }, resolved, extraHeaders);
}

/**
 * Convert any thrown value into the §5 error envelope Response.
 * HttpError → its code/status; anything else → 500 INTERNAL.
 * @param {*} e
 * @returns {Response}
 */
export function errorResponse(e) {
  if (e instanceof HttpError) return err(e.code, e.message, e.status);
  const message = e && e.message ? String(e.message) : 'Internal error';
  return err('INTERNAL', message, 500);
}
