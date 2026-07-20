// functions/lib/volume.js
// SPEC §6.1 Inventory → Volume.
//   total_cuft = Σ (quantity_i × standard_volume_i)   // over all line items
//   total_cbm  = total_cuft × 0.0283168               // CBM_PER_CUFT
// Named-item volumes come from the KV `config:item_volumes` catalog (passed in as
// `itemTable`); box keys small/medium/large (1.5/3.0/4.5) live in that same table so
// `key` resolves uniformly. Rounding (§6): cuft → 2 dec, CBM → 4 dec, at the boundary.

import { round } from './round.js';
import { CBM_PER_CUFT } from './constants.js';
import { HttpError } from './respond.js';

/**
 * Compute total cubic feet / CBM and per-line subtotals for an inventory list.
 * @param {Array<{key?:string,label?:string,quantity:number,volume_cuft?:number}>} items
 * @param {Object<string,{label:string,volume_cuft:number}>} [itemTable] resolved KV catalog
 * @returns {{total_cuft:number,total_cbm:number,line_items:Array<{key:(string|null),label:string,quantity:number,volume_cuft:number,subtotal_cuft:number}>}}
 * @throws {HttpError} VALIDATION on empty list, bad quantity, or unresolvable key/volume
 */
export function computeVolume(items, itemTable = {}) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new HttpError('VALIDATION', 'items must be a non-empty array');
  }

  let rawTotalCuft = 0;
  const line_items = items.map((item) => {
    if (!item || typeof item !== 'object') {
      throw new HttpError('VALIDATION', 'each item must be an object');
    }
    // quantity must be a positive integer.
    const quantity = item.quantity;
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new HttpError('VALIDATION', 'quantity must be an integer greater than 0');
    }

    let volume_cuft;
    let label;
    let key = null;
    if (item.key != null && item.key !== '') {
      // Resolve volume + label from the KV catalog (includes small/medium/large boxes).
      const entry = itemTable[item.key];
      if (!entry || typeof entry.volume_cuft !== 'number') {
        throw new HttpError('VALIDATION', `unknown item key: ${item.key}`);
      }
      key = item.key;
      volume_cuft = entry.volume_cuft;
      label = item.label || entry.label;
    } else if (typeof item.volume_cuft === 'number' && item.volume_cuft > 0) {
      // Ad-hoc line item: caller supplied its own volume + label.
      volume_cuft = item.volume_cuft;
      label = item.label || 'Custom item';
    } else {
      throw new HttpError('VALIDATION', 'each item needs a valid key or a positive volume_cuft');
    }

    const subtotal_cuft = quantity * volume_cuft;
    rawTotalCuft += subtotal_cuft;
    return {
      key,
      label,
      quantity,
      volume_cuft: round(volume_cuft, 2),
      subtotal_cuft: round(subtotal_cuft, 2),
    };
  });

  const total_cuft = round(rawTotalCuft, 2); // §6 boundary rounding: cuft → 2 dec
  const total_cbm = round(rawTotalCuft * CBM_PER_CUFT, 4); // CBM → 4 dec
  return { total_cuft, total_cbm, line_items };
}
