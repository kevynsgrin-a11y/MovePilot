// functions/lib/address.js
// SPEC §5 (Address/NCOA), §6.9 (address standardization fallback), §3 feature 12.
// Exports:
//   • standardizeAddressFallback({street,city,state,zip}) — deterministic normalization
//     used when NCOA_PROVIDER_KEY is unset (the provider path overrides it).
//   • UTILITY_CHECKLIST — the static utility-transfer checklist appended to every response.
//   • US_STATES — the set of valid 2-letter USPS state/territory codes.
// Pure ESM, no runtime deps — importable by Functions and Vitest.

import { HttpError } from './respond.js';

// Valid 2-letter USPS codes: 50 states + DC (used to validate `state`, §6.9).
export const US_STATES = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  'DC',
]);

// §6.9: common street-suffix expansions, applied to the LAST token, case-insensitively.
const SUFFIX_MAP = Object.freeze({
  ST: 'Street',
  AVE: 'Avenue',
  RD: 'Road',
  BLVD: 'Boulevard',
  DR: 'Drive',
  LN: 'Lane',
  CT: 'Court',
});

// §5 / §3 feature 12: the static utility-transfer checklist appended to every
// /api/address/standardize response (provider OR fallback path).
export const UTILITY_CHECKLIST = Object.freeze([
  { category: 'electricity', task: 'Schedule electricity disconnect at old address and connect at new address.' },
  { category: 'gas', task: 'Transfer or start natural-gas service; confirm safety/meter appointment if required.' },
  { category: 'water_sewer', task: 'Close water/sewer account at old address and open service at new address.' },
  { category: 'trash', task: 'Cancel trash/recycling pickup at old address and arrange collection at new address.' },
  { category: 'internet_cable', task: 'Transfer or reinstall internet/cable service; return leased equipment if changing providers.' },
  { category: 'usps', task: 'File USPS change of address (NCOA) — official fee is $1.25.' },
  { category: 'insurance', task: 'Update homeowner/renter insurance policy to the new address.' },
  { category: 'dmv', task: 'Update driver license and vehicle registration address with the DMV.' },
]);

/** Title-case a single word: first letter upper, rest lower. Leaves digits intact. */
function titleWord(word) {
  if (!word) return word;
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/** Title-case each whitespace-separated token of a string. */
function titleCase(str) {
  return str
    .split(/\s+/)
    .filter((w) => w.length > 0)
    .map(titleWord)
    .join(' ');
}

/**
 * Deterministic NCOA-fallback address normalization (§6.9).
 *   - trim all fields; require all four present
 *   - state → uppercase 2-letter, validated against US_STATES (else 400)
 *   - city  → title-case
 *   - street→ collapse internal whitespace, title-case, expand suffix on last token
 *   - zip   → first 5 digits; if input has -####, populate zip4
 * @param {{street:string,city:string,state:string,zip:string}} input
 * @returns {{street:string,city:string,state:string,zip:string,zip4?:string}}
 * @throws {HttpError} VALIDATION on missing fields / invalid state / invalid zip
 */
export function standardizeAddressFallback(input) {
  const src = input || {};
  const street = typeof src.street === 'string' ? src.street.trim() : '';
  const city = typeof src.city === 'string' ? src.city.trim() : '';
  const stateRaw = typeof src.state === 'string' ? src.state.trim() : '';
  const zipRaw = typeof src.zip === 'string' ? src.zip.trim() : String(src.zip ?? '').trim();

  if (!street || !city || !stateRaw || !zipRaw) {
    throw new HttpError('VALIDATION', 'street, city, state, and zip are all required.');
  }

  // State: uppercase 2-letter, must be a real USPS code.
  const state = stateRaw.toUpperCase();
  if (!US_STATES.has(state)) {
    throw new HttpError('VALIDATION', `Invalid US state code: ${stateRaw}`);
  }

  // City: title-case.
  const cityOut = titleCase(city);

  // Street: collapse internal whitespace, title-case each token, expand last suffix.
  const collapsed = street.replace(/\s+/g, ' ');
  const tokens = collapsed.split(' ').map(titleWord);
  if (tokens.length > 0) {
    const last = tokens[tokens.length - 1];
    const suffixKey = last.replace(/\.$/, '').toUpperCase(); // tolerate a trailing period
    if (SUFFIX_MAP[suffixKey]) tokens[tokens.length - 1] = SUFFIX_MAP[suffixKey];
  }
  const streetOut = tokens.join(' ');

  // Zip: first 5 digits, optional -#### → zip4.
  const zipMatch = /^(\d{5})(?:-(\d{4}))?/.exec(zipRaw);
  if (!zipMatch) {
    throw new HttpError('VALIDATION', `Invalid ZIP code: ${zipRaw}`);
  }
  const out = { street: streetOut, city: cityOut, state, zip: zipMatch[1] };
  if (zipMatch[2]) out.zip4 = zipMatch[2];
  return out;
}
