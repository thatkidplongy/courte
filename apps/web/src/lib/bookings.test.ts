import { describe, expect, it } from 'vitest';

import type { BookingSummary } from '@courte/contract';

import { filterBookingsByPeriod, findNextBooking, isBookingPeriod } from './bookings';

const NOW = Date.parse('2026-08-13T12:00:00.000Z');
const HOUR = 60 * 60_000;

const buildBooking = (overrides: Partial<BookingSummary> = {}): BookingSummary =>
  ({
    id: 'b1',
    venueName: 'El Roi Badminton',
    venueTimezone: 'Asia/Manila',
    courtNames: ['Court A'],
    status: 'confirmed',
    paymentState: 'unpaid',
    totalCents: 30000,
    playStartIso: new Date(NOW + HOUR).toISOString(),
    playEndIso: new Date(NOW + 2 * HOUR).toISOString(),
    holdExpiresAtIso: null,
    ...overrides,
  }) as BookingSummary;

describe('isBookingPeriod', () => {
  it('accepts the two real periods and nothing else', () => {
    expect(isBookingPeriod('upcoming')).toBe(true);
    expect(isBookingPeriod('past')).toBe(true);
    expect(isBookingPeriod('yesterday')).toBe(false);
    expect(isBookingPeriod(undefined)).toBe(false);
  });
});

describe('filterBookingsByPeriod', () => {
  it('keeps a game already in progress under upcoming', () => {
    const inProgress = buildBooking({
      playStartIso: new Date(NOW - HOUR).toISOString(),
      playEndIso: new Date(NOW + HOUR).toISOString(),
    });

    expect(filterBookingsByPeriod([inProgress], 'upcoming', NOW)).toHaveLength(1);
    expect(filterBookingsByPeriod([inProgress], 'past', NOW)).toHaveLength(0);
  });

  it('moves a booking to past once play has finished', () => {
    const finished = buildBooking({
      playStartIso: new Date(NOW - 3 * HOUR).toISOString(),
      playEndIso: new Date(NOW - 2 * HOUR).toISOString(),
    });

    expect(filterBookingsByPeriod([finished], 'past', NOW)).toHaveLength(1);
    expect(filterBookingsByPeriod([finished], 'upcoming', NOW)).toHaveLength(0);
  });
});

describe('findNextBooking', () => {
  it('returns the soonest booking still ahead, not merely the first in the list', () => {
    const later = buildBooking({ id: 'later', playStartIso: new Date(NOW + 5 * HOUR).toISOString() });
    const sooner = buildBooking({
      id: 'sooner',
      playStartIso: new Date(NOW + HOUR).toISOString(),
      playEndIso: new Date(NOW + 2 * HOUR).toISOString(),
    });

    expect(findNextBooking([later, sooner], NOW)?.id).toBe('sooner');
  });

  it('ignores a cancelled booking however near it is', () => {
    const cancelled = buildBooking({ id: 'cancelled', status: 'cancelled' });

    expect(findNextBooking([cancelled], NOW)).toBeNull();
  });

  it('returns null when everything has already been played', () => {
    const finished = buildBooking({ playEndIso: new Date(NOW - HOUR).toISOString() });

    expect(findNextBooking([finished], NOW)).toBeNull();
  });
});
