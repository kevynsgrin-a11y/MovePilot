// test/timeline.test.js — SPEC §6.7 fixtures EXACT (mocked today 2026-06-01).
import { describe, it, expect } from 'vitest';
import { generateTimeline } from '../functions/lib/timeline.js';

// §6.7 example: move_date 2026-08-01 with today mocked BEFORE 2026-06-06 so nothing
// is overdue. Offsets 8 / 4 / -1 → due 2026-06-06 / 2026-07-04 / 2026-08-08.
const TODAY = new Date('2026-06-01T00:00:00Z');

describe('generateTimeline (§6.7)', () => {
  it('computes the exact due dates for the §6.7 example', () => {
    const { move_date, tasks } = generateTimeline('2026-08-01', TODAY);
    expect(move_date).toBe('2026-08-01');

    const research = tasks.find((t) => t.week_offset === 8);
    expect(research.due_date).toBe('2026-06-06');
    expect(research.title).toBe('Research movers & verify FMCSA authorization');

    const usps = tasks.find((t) => t.week_offset === 4 && t.category === 'address');
    expect(usps.due_date).toBe('2026-07-04');

    const postMove = tasks.find((t) => t.week_offset === -1);
    expect(postMove.due_date).toBe('2026-08-08');

    // nothing is overdue with today = 2026-06-01 (earliest due is 2026-06-06)
    expect(tasks.every((t) => t.overdue === false)).toBe(true);
  });

  it('returns the full fixed template in order, including the school-enrollment task', () => {
    const { tasks } = generateTimeline('2026-08-01', TODAY);
    expect(tasks).toHaveLength(10);
    expect(tasks.map((t) => t.week_offset)).toEqual([8, 6, 6, 4, 4, 4, 2, 1, 0, -1]);
    const family = tasks.find((t) => t.category === 'family');
    expect(family).toBeDefined();
    expect(family.title).toBe('Confirm school enrollment / records-transfer deadlines');
    expect(family.week_offset).toBe(4);
    expect(family.due_date).toBe('2026-07-04');
    // every task carries the required shape
    for (const t of tasks) {
      expect(t.done).toBe(false);
      expect(typeof t.overdue).toBe('boolean');
      expect(typeof t.category).toBe('string');
      expect(typeof t.title).toBe('string');
    }
  });

  it('flags tasks whose due_date is before today as overdue', () => {
    // move 2026-06-10, today 2026-06-08: offset-8 due 2026-04-15 is overdue,
    // offset-0 (moveweek) due 2026-06-10 is not.
    const { tasks } = generateTimeline('2026-06-10', new Date('2026-06-08T00:00:00Z'));
    const research = tasks.find((t) => t.week_offset === 8);
    const moveweek = tasks.find((t) => t.week_offset === 0);
    expect(research.overdue).toBe(true);
    expect(moveweek.overdue).toBe(false);
  });

  it('rejects an unparseable move_date', () => {
    expect(() => generateTimeline('not-a-date', TODAY)).toThrow();
    expect(() => generateTimeline('2026-13-40', TODAY)).toThrow();
  });

  it('rejects a move_date in the past relative to today', () => {
    expect(() => generateTimeline('2026-05-01', TODAY)).toThrow();
  });
});
