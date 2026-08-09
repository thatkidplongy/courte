import { describe, expect, it } from 'vitest';

import type { ReleasedRange, WaitlistCandidate } from './matchOffers';
import { matchOffers } from './matchOffers';

const HOUR = 3_600_000;
const T0 = Date.parse('2026-08-10T09:00:00Z');

const released: ReleasedRange[] = [{ courtId: 'c1', venueId: 'v1', interval: { start: T0, end: T0 + 2 * HOUR } }];

const candidate = (overrides: Partial<WaitlistCandidate>): WaitlistCandidate => ({
  id: 'w1',
  courtId: null,
  venueId: 'v1',
  desired: { start: T0, end: T0 + 2 * HOUR },
  minDurationMinutes: 60,
  createdAt: new Date('2026-08-01T00:00:00Z'),
  ...overrides,
});

describe('matchOffers', () => {
  it('offers a released range to the oldest matching entry only', () => {
    const offers = matchOffers(released, [
      candidate({ id: 'newer', createdAt: new Date('2026-08-05T00:00:00Z') }),
      candidate({ id: 'older', createdAt: new Date('2026-08-01T00:00:00Z') }),
    ]);

    expect(offers).toHaveLength(1);
    expect(offers[0]?.entryId).toBe('older');
  });

  it('skips entries whose usable overlap is shorter than their minimum duration', () => {
    const offers = matchOffers(released, [
      candidate({ desired: { start: T0 + HOUR + 30 * 60_000, end: T0 + 4 * HOUR }, minDurationMinutes: 60 }),
    ]);

    expect(offers).toHaveLength(0);
  });

  it('matches court-specific entries only on that court', () => {
    const offers = matchOffers(released, [
      candidate({ id: 'wrong-court', courtId: 'c9' }),
      candidate({ id: 'right-court', courtId: 'c1', createdAt: new Date('2026-08-06T00:00:00Z') }),
    ]);

    expect(offers).toHaveLength(1);
    expect(offers[0]?.entryId).toBe('right-court');
  });

  it('matches venue-wide entries against any court at the venue', () => {
    const offers = matchOffers(released, [candidate({ venueId: 'v1', courtId: null })]);

    expect(offers).toHaveLength(1);
    expect(offers[0]?.courtId).toBe('c1');
  });

  it('never offers one entry twice across multiple released ranges', () => {
    const twoRanges: ReleasedRange[] = [
      ...released,
      { courtId: 'c2', venueId: 'v1', interval: { start: T0, end: T0 + 2 * HOUR } },
    ];

    const offers = matchOffers(twoRanges, [candidate({})]);

    expect(offers).toHaveLength(1);
  });

  it('hands the entry the overlap, not the whole released range', () => {
    const offers = matchOffers(released, [
      candidate({ desired: { start: T0 + HOUR, end: T0 + 3 * HOUR }, minDurationMinutes: 60 }),
    ]);

    expect(offers[0]?.interval).toEqual({ start: T0 + HOUR, end: T0 + 2 * HOUR });
  });
});
