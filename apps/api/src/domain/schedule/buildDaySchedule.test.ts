import { describe, expect, it } from 'vitest';

import { buildDaySchedule, listOpenHourStarts } from './buildDaySchedule';

const HOUR = 60 * 60_000;
const NOON = Date.UTC(2026, 7, 13, 12);

const hours = (count: number, from = NOON): number[] => Array.from({ length: count }, (_, i) => from + i * HOUR);

const courts = [{ id: 'c1', minDurationMinutes: 60 }];

describe('buildDaySchedule', () => {
  it('marks an hour outside opening hours as closed, not booked', () => {
    const [row] = buildDaySchedule({
      courts,
      openByCourt: new Map([['c1', [{ start: NOON, end: NOON + HOUR }]]]),
      freeByCourt: new Map([['c1', [{ start: NOON, end: NOON + HOUR }]]]),
      hourStarts: hours(2),
      notBefore: 0,
    });

    expect(row?.cells.map(cell => cell.state)).toEqual(['open', 'closed']);
  });

  it('marks an open-but-reserved hour as booked', () => {
    const [row] = buildDaySchedule({
      courts,
      openByCourt: new Map([['c1', [{ start: NOON, end: NOON + 2 * HOUR }]]]),
      freeByCourt: new Map([['c1', [{ start: NOON, end: NOON + HOUR }]]]),
      hourStarts: hours(2),
      notBefore: 0,
    });

    expect(row?.cells.map(cell => cell.state)).toEqual(['open', 'booked']);
  });

  it('closes an hour that has already started, however free the calendar says it is', () => {
    const [row] = buildDaySchedule({
      courts,
      openByCourt: new Map([['c1', [{ start: NOON, end: NOON + 2 * HOUR }]]]),
      freeByCourt: new Map([['c1', [{ start: NOON, end: NOON + 2 * HOUR }]]]),
      hourStarts: hours(2),
      notBefore: NOON + 30 * 60_000,
    });

    expect(row?.cells.map(cell => cell.state)).toEqual(['closed', 'open']);
  });

  it('will not offer an hour a longer minimum booking cannot fit into', () => {
    const [row] = buildDaySchedule({
      courts: [{ id: 'c1', minDurationMinutes: 90 }],
      openByCourt: new Map([['c1', [{ start: NOON, end: NOON + 3 * HOUR }]]]),
      // Exactly one free hour: enough for the cell, not enough for the court's minimum.
      freeByCourt: new Map([['c1', [{ start: NOON, end: NOON + HOUR }]]]),
      hourStarts: hours(1),
      notBefore: 0,
    });

    expect(row?.cells[0]?.state).toBe('booked');
  });

  it('gives a court with no data a full row of closed cells rather than dropping it', () => {
    const [row] = buildDaySchedule({
      courts,
      openByCourt: new Map(),
      freeByCourt: new Map(),
      hourStarts: hours(3),
      notBefore: 0,
    });

    expect(row?.cells).toHaveLength(3);
    expect(row?.cells.every(cell => cell.state === 'closed')).toBe(true);
  });
});

describe('listOpenHourStarts', () => {
  it('keeps only the hours some court is open for', () => {
    const open = [{ start: NOON + HOUR, end: NOON + 3 * HOUR }];

    expect(listOpenHourStarts(open, hours(5))).toEqual([NOON + HOUR, NOON + 2 * HOUR]);
  });

  it('includes an hour the venue is open for only part of', () => {
    const open = [{ start: NOON + 30 * 60_000, end: NOON + 45 * 60_000 }];

    expect(listOpenHourStarts(open, hours(2))).toEqual([NOON]);
  });

  it('returns nothing when the venue is shut all day', () => {
    expect(listOpenHourStarts([], hours(4))).toEqual([]);
  });
});
