// functions/_middleware.js
// Pages Functions middleware (runs before every /functions route):
//   1. CORS preflight — answer OPTIONS directly with the CORS headers.
//   2. Error-to-JSON wrapper — any thrown value from a handler becomes the §5
//      error envelope instead of a bare 500 HTML page.
//   3. CORS headers are attached to every response.
// (JSON *body* parsing is done per-handler via readJson(); this guard only ensures a
// non-GET/DELETE request that declares a body uses application/json.)

import { CORS_HEADERS, errorResponse } from './lib/respond.js';

export async function onRequest(context) {
  const { request, next } = context;

  // 1. CORS preflight.
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  let response;
  try {
    response = await next();
  } catch (e) {
    response = errorResponse(e);
  }

  // 3. Ensure CORS headers on every response (clone to a mutable headers set).
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(CORS_HEADERS)) headers.set(k, v);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Shared JSON body reader for handlers. Rejects a non-JSON content-type with a
 * §5 VALIDATION error and tolerates an empty body as {}.
 * @param {Request} request
 * @returns {Promise<object>}
 */
export async function readJson(request) {
  const { HttpError } = await import('./lib/respond.js');
  const ct = request.headers.get('Content-Type') || '';
  const text = await request.text();
  if (!text || text.trim() === '') return {};
  if (!ct.toLowerCase().includes('application/json')) {
    throw new HttpError('VALIDATION', 'Request body must be application/json.');
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError('VALIDATION', 'Request body is not valid JSON.');
  }
}
