import { DateTime } from 'luxon';
import { describe, expect, it } from 'vitest';

import { doesSlotFit, getAvailability, mergeIntervals, projectWindows, subtractIntervals } from './getAvailability';
import type { Interval, OpeningWindow } from './types';

/**
 * Ids are integers. Named constants rather than bare numbers so a failing
 * assertion still says which fixture it means.
 */
const C1 = 1;
const C2 = 2;
const UNKNOWN = 3;

const MANILA = 'Asia/Manila';

const at = (iso: string, zone = MANILA): number => DateTime.fromISO(iso, { zone }).toMillis();

const manilaDay = (date: string): Interval => ({
  start: at(`${date}T00:00`),
  end: at(`${date}T24:00`),
});

// 2026-08-10 is a Monday, which is dayOfWeek 0 in our convention.
const MONDAY = '2026-08-10';
const TUESDAY = '2026-08-11';

describe('mergeIntervals', () => {
  it('merges overlapping and adjacent intervals into maximal runs', () => {
    const merged = mergeIntervals([
      { start: 10, end: 20 },
      { start: 15, end: 30 },
      { start: 30, end: 40 },
      { start: 50, end: 60 },
    ]);

    expect(merged).toEqual([
      { start: 10, end: 40 },
      { start: 50, end: 60 },
    ]);
  });

  it('sorts unordered input', () => {
    expect(
      mergeIntervals([
        { start: 50, end: 60 },
        { start: 10, end: 20 },
      ])
    ).toEqual([
      { start: 10, end: 20 },
      { start: 50, end: 60 },
    ]);
  });
});

describe('subtractIntervals', () => {
  it('punches holes and keeps the remainder', () => {
    const remaining = subtractIntervals(
      [{ start: 0, end: 100 }],
      [
        { start: 20, end: 30 },
        { start: 60, end: 70 },
      ]
    );

    expect(remaining).toEqual([
      { start: 0, end: 20 },
      { start: 30, end: 60 },
      { start: 70, end: 100 },
    ]);
  });

  it('drops a base interval entirely covered by a hole', () => {
    expect(subtractIntervals([{ start: 10, end: 20 }], [{ start: 0, end: 30 }])).toEqual([]);
  });

  it('clips holes that extend past either edge', () => {
    expect(
      subtractIntervals(
        [{ start: 10, end: 20 }],
        [
          { start: 0, end: 12 },
          { start: 18, end: 30 },
        ]
      )
    ).toEqual([{ start: 12, end: 18 }]);
  });
});

describe('projectWindows', () => {
  it('projects a badminton-style 10:00-to-midnight window onto its day', () => {
    const windows: OpeningWindow[] = [{ courtId: C1, dayOfWeek: 0, startsAt: '10:00', durationMinutes: 840 }];

    const projected = projectWindows(windows, manilaDay(MONDAY), MANILA);

    expect(projected).toEqual([{ start: at(`${MONDAY}T10:00`), end: at(`${MONDAY}T24:00`) }]);
  });

  it('carries a 24/7 single-window court across every day of the week', () => {
    // One week-long window anchored on Monday must fully cover a Thursday.
    const windows: OpeningWindow[] = [{ courtId: C1, dayOfWeek: 0, startsAt: '00:00', durationMinutes: 10080 }];
    const thursday = manilaDay('2026-08-13');

    expect(projectWindows(windows, thursday, MANILA)).toEqual([thursday]);
  });

  it('lets a late window spill past midnight into the next day', () => {
    // Monday 22:00 for 4 hours reaches into Tuesday 02:00.
    const windows: OpeningWindow[] = [{ courtId: C1, dayOfWeek: 0, startsAt: '22:00', durationMinutes: 240 }];

    const projected = projectWindows(windows, manilaDay(TUESDAY), MANILA);

    expect(projected).toEqual([{ start: at(`${TUESDAY}T00:00`), end: at(`${TUESDAY}T02:00`) }]);
  });

  it('returns nothing on a closed day', () => {
    const windows: OpeningWindow[] = [{ courtId: C1, dayOfWeek: 0, startsAt: '10:00', durationMinutes: 60 }];

    expect(projectWindows(windows, manilaDay(TUESDAY), MANILA)).toEqual([]);
  });
});

describe('getAvailability', () => {
  const windows: OpeningWindow[] = [{ courtId: C1, dayOfWeek: 0, startsAt: '10:00', durationMinutes: 840 }];

  it('subtracts reservations from open time', () => {
    const [result] = getAvailability({
      courtIds: [C1],
      range: manilaDay(MONDAY),
      timezone: MANILA,
      windows,
      blocked: [{ courtId: C1, start: at(`${MONDAY}T17:00`), end: at(`${MONDAY}T19:00`) }],
    });

    expect(result?.free).toEqual([
      { start: at(`${MONDAY}T10:00`), end: at(`${MONDAY}T17:00`) },
      { start: at(`${MONDAY}T19:00`), end: at(`${MONDAY}T24:00`) },
    ]);
  });

  it('does not bleed one court’s reservations into another', () => {
    const results = getAvailability({
      courtIds: [C1, C2],
      range: manilaDay(MONDAY),
      timezone: MANILA,
      windows: [...windows, { courtId: C2, dayOfWeek: 0, startsAt: '10:00', durationMinutes: 840 }],
      blocked: [{ courtId: C1, start: at(`${MONDAY}T10:00`), end: at(`${MONDAY}T24:00`) }],
    });

    expect(results.find(r => r.courtId === C1)?.free).toEqual([]);
    expect(results.find(r => r.courtId === C2)?.free).toHaveLength(1);
  });

  it('returns no availability for a court with no windows', () => {
    const [result] = getAvailability({
      courtIds: [UNKNOWN],
      range: manilaDay(MONDAY),
      timezone: MANILA,
      windows,
      blocked: [],
    });

    expect(result?.free).toEqual([]);
  });
});

describe('doesSlotFit', () => {
  const availability = {
    courtId: C1,
    free: [{ start: at(`${MONDAY}T10:00`), end: at(`${MONDAY}T14:00`) }],
  };

  it('accepts a slot fully inside a free interval', () => {
    expect(doesSlotFit({ availability, requested: { start: at(`${MONDAY}T11:00`), end: at(`${MONDAY}T12:30`) } })).toBe(
      true
    );
  });

  it('rejects a slot that leaks past the free interval edge', () => {
    expect(doesSlotFit({ availability, requested: { start: at(`${MONDAY}T13:00`), end: at(`${MONDAY}T14:30`) } })).toBe(
      false
    );
  });

  it('rejects a slot spanning two free intervals with a gap between', () => {
    const split = {
      courtId: C1,
      free: [
        { start: at(`${MONDAY}T10:00`), end: at(`${MONDAY}T12:00`) },
        { start: at(`${MONDAY}T13:00`), end: at(`${MONDAY}T15:00`) },
      ],
    };

    expect(
      doesSlotFit({ availability: split, requested: { start: at(`${MONDAY}T11:00`), end: at(`${MONDAY}T14:00`) } })
    ).toBe(false);
  });
});
