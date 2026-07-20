// scripts/seed-kv.js
// Load the static config tables (seed/*.json) into the MP_KV namespace via Wrangler.
// KV layout per SPEC §4.3:
//   config:item_volumes        <- seed/item_volumes.json
//   config:box_sizes           <- seed/box_sizes.json
//   config:dim_divisors        <- seed/dim_divisors.json
//   config:box_rates_per_bedroom <- seed/box_rates_per_bedroom.json
//   config:ad_slots            <- seed/ad_slots.json
//   geo:zip3:<prefix>          <- one key per entry in seed/zip3_centroids.json (§12.3)
//
// This is a BUILD/DEV script (runs under Node, not the Worker). It shells out to
// `wrangler kv key put`. Pass --remote to target the deployed namespace; default is
// local (--local, the namespace used by `wrangler pages dev`).
//
// Usage:
//   node scripts/seed-kv.js            # seed local KV (for wrangler pages dev)
//   node scripts/seed-kv.js --remote   # seed the remote KV namespace
//   node scripts/seed-kv.js --print    # just print the wrangler commands, run nothing

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const BINDING = 'MP_KV';

// key -> seed file
const MAP = {
  'config:item_volumes': 'seed/item_volumes.json',
  'config:box_sizes': 'seed/box_sizes.json',
  'config:dim_divisors': 'seed/dim_divisors.json',
  'config:box_rates_per_bedroom': 'seed/box_rates_per_bedroom.json',
  'config:ad_slots': 'seed/ad_slots.json',
};

const args = process.argv.slice(2);
const remote = args.includes('--remote');
const printOnly = args.includes('--print');
const scopeFlag = remote ? '--remote' : '--local';

for (const [key, rel] of Object.entries(MAP)) {
  // Minify the JSON so it stores compactly and is valid on read.
  const value = JSON.stringify(JSON.parse(readFileSync(join(ROOT, rel), 'utf8')));
  const cmdArgs = ['wrangler', 'kv', 'key', 'put', '--binding', BINDING, scopeFlag, key, value];
  if (printOnly) {
    console.log('npx ' + cmdArgs.map((a) => (/\s|["{]/.test(a) ? JSON.stringify(a) : a)).join(' '));
    continue;
  }
  console.log(`Seeding ${key} <- ${rel} (${scopeFlag})`);
  const res = spawnSync('npx', cmdArgs, { cwd: ROOT, stdio: 'inherit' });
  if (res.status !== 0) {
    console.error(`Failed to seed ${key} (exit ${res.status}).`);
    process.exit(res.status || 1);
  }
}

// §12.3: fan the ZIP-3 centroid table out into one KV key per prefix (geo:zip3:<prefix>)
// so functions/lib/geo.js can resolve a lane endpoint edge-local without loading the
// whole table. functions/lib/geo.js also bundles the same starter set as a fallback.
const zip3 = JSON.parse(readFileSync(join(ROOT, 'seed/zip3_centroids.json'), 'utf8'));
for (const [prefix, centroid] of Object.entries(zip3)) {
  const key = `geo:zip3:${prefix}`;
  const value = JSON.stringify(centroid);
  const cmdArgs = ['wrangler', 'kv', 'key', 'put', '--binding', BINDING, scopeFlag, key, value];
  if (printOnly) {
    console.log('npx ' + cmdArgs.map((a) => (/\s|["{]/.test(a) ? JSON.stringify(a) : a)).join(' '));
    continue;
  }
  console.log(`Seeding ${key} <- seed/zip3_centroids.json (${scopeFlag})`);
  const res = spawnSync('npx', cmdArgs, { cwd: ROOT, stdio: 'inherit' });
  if (res.status !== 0) {
    console.error(`Failed to seed ${key} (exit ${res.status}).`);
    process.exit(res.status || 1);
  }
}

if (!printOnly) console.log('KV seed complete.');
