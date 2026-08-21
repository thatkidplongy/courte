import { describe, expect, it } from 'vitest';

import { canStartAt } from './canStartAt';

const MANILA = 'Asia/Manila';
const DATE = '2026-08-10';

/** 17:00–21:00 in Manila, the evening block a player actually competes for. */
const EVENING = [{ start: Date.parse('2026-08-10T09:00:00Z'), end: Date.parse('2026-08-10T13:00:00Z') }];

const baseParams = {
  free: EVENING,
  durationMinutes: 60,
  incrementMinutes: 60,
  notBefore: 0,
  date: DATE,
  timezone: MANILA,
  limit: 48,
};

describe('canStartAt', () => {
  it('matches a start inside the free block', () => {
    expect(canStartAt({ ...baseParams, time: '18:00' })).toBe(true);
  });

  it('reads the time in the venue zone, not UTC', () => {
    // 09:00 UTC is the block's first instant, but nobody plays at 09:00 in Manila.
    expect(canStartAt({ ...baseParams, time: '09:00' })).toBe(false);
    expect(canStartAt({ ...baseParams, time: '17:00' })).toBe(true);
  });

  it('refuses a start the duration cannot fit before closing', () => {
    // The block ends at 21:00, so a one-hour game cannot begin then.
    expect(canStartAt({ ...baseParams, time: '21:00' })).toBe(false);
    expect(canStartAt({ ...baseParams, time: '20:00' })).toBe(true);
  });

  it('refuses a time that is not on the court increment grid', () => {
    expect(canStartAt({ ...baseParams, time: '18:30' })).toBe(false);
    expect(canStartAt({ ...baseParams, incrementMinutes: 30, time: '18:30' })).toBe(true);
  });

  it('refuses a start already in the past', () => {
    const notBefore = Date.parse('2026-08-10T11:00:00Z');
    expect(canStartAt({ ...baseParams, notBefore, time: '18:00' })).toBe(false);
    expect(canStartAt({ ...baseParams, notBefore, time: '19:00' })).toBe(true);
  });

  it('treats an unparseable time as no match rather than throwing', () => {
    expect(canStartAt({ ...baseParams, time: 'half past six' })).toBe(false);
  });

  it('finds a start in a later block after a booking splits the day', () => {
    const split = [
      { start: Date.parse('2026-08-10T09:00:00Z'), end: Date.parse('2026-08-10T10:00:00Z') },
      { start: Date.parse('2026-08-10T11:00:00Z'), end: Date.parse('2026-08-10T13:00:00Z') },
    ];

    // 18:00 Manila sits in the gap the booking took; 19:00 opens the second block.
    expect(canStartAt({ ...baseParams, free: split, time: '18:00' })).toBe(false);
    expect(canStartAt({ ...baseParams, free: split, time: '19:00' })).toBe(true);
  });
});
