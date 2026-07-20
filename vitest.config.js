// vitest.config.js
// Plain Node test environment. Tests import functions/lib/*.js directly as ESM —
// those modules use only Web-standard globals (crypto, fetch, atob/btoa, Date) that
// Node >= 20 provides, so no Miniflare/workerd harness is required for unit tests.
// Endpoint smoke tests boot `wrangler pages dev` out-of-process and hit it over HTTP.

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.js'],
    // Smoke tests spin up wrangler and can take a while.
    testTimeout: 60000,
    hookTimeout: 120000,
  },
});
