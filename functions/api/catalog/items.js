// functions/api/catalog/items.js  →  GET /api/catalog/items
// SPEC §12.2 feature 26, §12.4, §12.7. No auth. Serves the named-item catalog (from
// KV config:item_volumes, seeded from seed/item_volumes.json) as an array, plus the
// §12.1 bedroom presets (cuft + a deterministic sample item list per size).

import { ok } from '../../lib/respond.js';
import { BEDROOM_CUFT } from '../../lib/constants.js';

// Fallback catalog matching seed/item_volumes.json (§4.3) so the surface always
// answers even before KV is seeded (mirrors the config/ad-slots.js fallback pattern).
const DEFAULT_ITEM_VOLUMES = {
  sofa: { label: 'Sofa (3-seat)', volume_cuft: 45.0 },
  loveseat: { label: 'Loveseat', volume_cuft: 30.0 },
  armchair: { label: 'Armchair', volume_cuft: 20.0 },
  queen_bed: { label: 'Queen bed + mattress', volume_cuft: 60.0 },
  king_bed: { label: 'King bed + mattress', volume_cuft: 70.0 },
  twin_bed: { label: 'Twin bed + mattress', volume_cuft: 40.0 },
  dresser: { label: 'Dresser', volume_cuft: 25.0 },
  nightstand: { label: 'Nightstand', volume_cuft: 8.0 },
  dining_table: { label: 'Dining table', volume_cuft: 35.0 },
  dining_chair: { label: 'Dining chair', volume_cuft: 5.0 },
  refrigerator: { label: 'Refrigerator', volume_cuft: 60.0 },
  washer: { label: 'Washer', volume_cuft: 25.0 },
  dryer: { label: 'Dryer', volume_cuft: 25.0 },
  tv_stand: { label: 'TV stand', volume_cuft: 20.0 },
  bookshelf: { label: 'Bookshelf', volume_cuft: 20.0 },
  desk: { label: 'Desk', volume_cuft: 25.0 },
  wardrobe_box: { label: 'Wardrobe box', volume_cuft: 13.0 },
  small: { label: 'Small box', volume_cuft: 1.5 },
  medium: { label: 'Medium box', volume_cuft: 3.0 },
  large: { label: 'Large box', volume_cuft: 4.5 },
};

// Deterministic sample item lists per bedroom preset (§12.7): catalog keys that
// roughly sum to the preset cuft. Fixed, documented — no runtime tuning.
const BEDROOM_PRESET_ITEMS = {
  studio: ['queen_bed', 'sofa', 'dresser', 'dining_table', 'tv_stand', 'refrigerator'],
  one: ['queen_bed', 'sofa', 'loveseat', 'dresser', 'nightstand', 'dining_table', 'dining_chair', 'refrigerator', 'washer', 'dryer'],
  two: ['queen_bed', 'twin_bed', 'sofa', 'loveseat', 'armchair', 'dresser', 'nightstand', 'dining_table', 'dining_chair', 'refrigerator', 'washer', 'dryer', 'bookshelf', 'desk'],
  three: ['king_bed', 'queen_bed', 'twin_bed', 'sofa', 'loveseat', 'armchair', 'dresser', 'nightstand', 'dining_table', 'dining_chair', 'refrigerator', 'washer', 'dryer', 'tv_stand', 'bookshelf', 'desk', 'wardrobe_box'],
  four: ['king_bed', 'queen_bed', 'twin_bed', 'twin_bed', 'sofa', 'loveseat', 'armchair', 'dresser', 'dresser', 'nightstand', 'dining_table', 'dining_chair', 'refrigerator', 'washer', 'dryer', 'tv_stand', 'bookshelf', 'desk', 'wardrobe_box'],
};

/** Load the item-volume catalog from KV (edge-local); fall back to the bundled copy. */
async function loadItemTable(env) {
  if (env && env.MP_KV) {
    const table = await env.MP_KV.get('config:item_volumes', 'json');
    if (table && typeof table === 'object') return table;
  }
  return DEFAULT_ITEM_VOLUMES;
}

export async function onRequestGet(context) {
  const { env } = context;
  const table = await loadItemTable(env);

  // Catalog as an array of {key,label,volume_cuft} (§12.4).
  const items = Object.entries(table).map(([key, v]) => ({
    key,
    label: v.label,
    volume_cuft: v.volume_cuft,
  }));

  // Bedroom presets from §12.1 BEDROOM_CUFT, each with its sample item key list (§12.7).
  const bedroom_presets = {};
  for (const [size, cuft] of Object.entries(BEDROOM_CUFT)) {
    bedroom_presets[size] = { cuft, items: BEDROOM_PRESET_ITEMS[size] || [] };
  }

  return ok({ items, bedroom_presets });
}
