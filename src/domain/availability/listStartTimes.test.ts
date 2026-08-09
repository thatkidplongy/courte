import { describe, expect, it } from 'vitest';

import { listStartTimes } from './listStartTimes';

const HOUR = 3_600_000;
const T0 = Date.parse('2026-08-10T10:00:00Z');

describe('listStartTimes', () => {
  it('steps by the increment and stops where the duration no longer fits', () => {
    const starts = listStartTimes({
      free: [{ start: T0, end: T0 + 2 * HOUR }],
      durationMinutes: 60,
      incrementMinutes: 30,
      notBefore: 0,
      limit: 10,
    });

    // 10:00, 10:30, 11:00 fit a one-hour booking inside 10:00-12:00; 11:30 does not.
    expect(starts).toEqual([T0, T0 + HOUR / 2, T0 + HOUR]);
  });

  it('suppresses starts in the past', () => {
    const starts = listStartTimes({
      free: [{ start: T0, end: T0 + 2 * HOUR }],
      durationMinutes: 60,
      incrementMinutes: 30,
      notBefore: T0 + 45 * 60_000,
      limit: 10,
    });

    expect(starts).toEqual([T0 + HOUR]);
  });

  it('caps at the limit across intervals', () => {
    const starts = listStartTimes({
      free: [
        { start: T0, end: T0 + 3 * HOUR },
        { start: T0 + 5 * HOUR, end: T0 + 8 * HOUR },
      ],
      durationMinutes: 60,
      incrementMinutes: 60,
      notBefore: 0,
      limit: 3,
    });

    expect(starts).toHaveLength(3);
  });
});
