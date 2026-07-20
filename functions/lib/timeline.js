// functions/lib/timeline.js
// SPEC §6.7 (timeline generation), §3 feature 11, §5 (Timeline).
// generateTimeline(move_date, today) produces the ordered week-by-week task list from
// the FIXED template below (which INCLUDES the school-enrollment "family" task).
//   week_offset = weeks BEFORE the move (0 = move week; positive = prior; -1 = post-move)
//   due_date    = move_date − (week_offset × 7 days)   (UTC date arithmetic)
//   overdue     = due_date < today  (still returned, just flagged)
// Reject a move_date that is unparseable or in the past relative to `today` (§6.7).
// Pure ESM — Cloudflare Workers runtime safe, importable by Functions and Vitest.

import { HttpError } from './respond.js';

const MS_PER_DAY = 86400000;

// §6.7 fixed template: [category, week_offset, title]. Order is preserved in output.
export const TIMELINE_TEMPLATE = Object.freeze([
  ['carrier', 8, 'Research movers & verify FMCSA authorization'],
  ['inventory', 6, 'Run inventory volume & box calculator; order supplies'],
  ['declutter', 6, "Declutter / sell / donate items you won't move"],
  ['address', 4, 'File USPS change of address (NCOA) — official fee is $1.25'],
  ['utilities', 4, 'Schedule utility transfers/disconnects'],
  ['family', 4, 'Confirm school enrollment / records-transfer deadlines'],
  ['carrier', 2, 'Confirm carrier, re-verify FMCSA status, review binding vs non-binding estimate'],
  ['packing', 1, 'Pack non-essentials; label boxes by room'],
  ['moveweek', 0, 'Moving week: final walkthrough, meter readings, hand off keys'],
  ['address', -1, 'Post-move: update address with banks/DMV; confirm mail forwarding'],
]);

/** Parse a strict YYYY-MM-DD string to a UTC-midnight epoch ms, or null if invalid. */
function parseIsoDateUtc(dateStr) {
  if (typeof dateStr !== 'string') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const ms = Date.UTC(year, month - 1, day);
  const d = new Date(ms);
  // Reject rollovers (e.g. 2026-02-30) — components must round-trip.
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) {
    return null;
  }
  return ms;
}

/** Normalize a `today` argument (Date | ISO string) to a UTC-midnight epoch ms. */
function todayMidnightUtc(today) {
  const d = today instanceof Date ? today : new Date(today);
  if (Number.isNaN(d.getTime())) {
    throw new HttpError('VALIDATION', 'Invalid "today" reference date.');
  }
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/**
 * Generate the dated timeline for a move.
 * @param {string} move_date  ISO date 'YYYY-MM-DD'
 * @param {Date|string} today reference "now" (server date; injectable for tests)
 * @returns {{move_date:string, tasks:Array<{week_offset:number,due_date:string,
 *   category:string,title:string,done:false,overdue:boolean}>}}
 * @throws {HttpError} VALIDATION on unparseable or past move_date
 */
export function generateTimeline(move_date, today = new Date()) {
  const moveMs = parseIsoDateUtc(move_date);
  if (moveMs == null) {
    throw new HttpError('VALIDATION', 'move_date must be a valid YYYY-MM-DD date.');
  }
  const todayMs = todayMidnightUtc(today);
  if (moveMs < todayMs) {
    throw new HttpError('VALIDATION', 'move_date cannot be in the past.');
  }

  const tasks = TIMELINE_TEMPLATE.map(([category, week_offset, title]) => {
    // §6.7: due_date = move_date − (week_offset × 7 days), computed in UTC.
    const dueMs = moveMs - week_offset * 7 * MS_PER_DAY;
    const due_date = new Date(dueMs).toISOString().slice(0, 10);
    return {
      week_offset,
      due_date,
      category,
      title,
      done: false,
      overdue: dueMs < todayMs, // still returned, flagged if already past
    };
  });

  return { move_date, tasks };
}
