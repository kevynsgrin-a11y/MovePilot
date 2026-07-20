import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// MovePilot frontend build. Outputs static assets to dist/ for Cloudflare Pages
// (pages_build_output_dir = "dist"). The /api/* Functions are served on the same
// origin by the existing Pages Functions router, so no dev proxy secrets are needed;
// during `vite` dev, point at a running `wrangler pages dev` for live API calls.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2020',
  },
  server: {
    port: 5173,
    // Proxy API calls to a locally-running `wrangler pages dev` (default :8788)
    // so the SPA can hit real endpoints in development without CORS juggling.
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8788',
        changeOrigin: true,
      },
    },
  },
});
