import { describe, expect, it } from 'vitest';

import { CancellationWindowPassedError } from '@/domain/errors';

import { assertCancellable } from './cancellationPolicy';

const DAY_MINUTES = 24 * 60;
const bookingStart = new Date('2026-08-12T10:00:00Z');

describe('assertCancellable', () => {
  it('allows cancellation outside the window', () => {
    expect(() =>
      assertCancellable({
        bookingStart,
        cancellationWindowMinutes: DAY_MINUTES,
        now: new Date('2026-08-10T10:00:00Z'),
        isVenueStaff: false,
      })
    ).not.toThrow();
  });

  it('rejects cancellation inside the window', () => {
    expect(() =>
      assertCancellable({
        bookingStart,
        cancellationWindowMinutes: DAY_MINUTES,
        now: new Date('2026-08-11T18:00:00Z'),
        isVenueStaff: false,
      })
    ).toThrow(CancellationWindowPassedError);
  });

  it('rejects exactly at the deadline — the boundary belongs to the venue', () => {
    expect(() =>
      assertCancellable({
        bookingStart,
        cancellationWindowMinutes: DAY_MINUTES,
        now: new Date('2026-08-11T10:00:00Z'),
        isVenueStaff: false,
      })
    ).toThrow(CancellationWindowPassedError);
  });

  it('lets venue staff waive their own policy', () => {
    expect(() =>
      assertCancellable({
        bookingStart,
        cancellationWindowMinutes: DAY_MINUTES,
        now: new Date('2026-08-12T09:59:00Z'),
        isVenueStaff: true,
      })
    ).not.toThrow();
  });
});
