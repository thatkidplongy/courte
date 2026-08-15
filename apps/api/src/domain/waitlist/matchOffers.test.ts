import { describe, expect, it } from 'vitest';

import type { ReleasedRange, WaitlistCandidate } from './matchOffers';
import { matchOffers } from './matchOffers';

/**
 * Ids are integers. Named constants rather than bare numbers so a failing
 * assertion still says which fixture it means.
 */
const C1 = 1;
const V1 = 2;
const W1 = 3;
const NEWER = 4;
const OLDER = 5;
const WRONG_COURT = 6;
const C9 = 7;
const RIGHT_COURT = 8;
const C2 = 9;

const HOUR = 3_600_000;
const T0 = Date.parse('2026-08-10T09:00:00Z');

const released: ReleasedRange[] = [{ courtId: C1, venueId: V1, interval: { start: T0, end: T0 + 2 * HOUR } }];

const candidate = (overrides: Partial<WaitlistCandidate>): WaitlistCandidate => ({
  id: W1,
  courtId: null,
  venueId: V1,
  desired: { start: T0, end: T0 + 2 * HOUR },
  minDurationMinutes: 60,
  createdAt: new Date('2026-08-01T00:00:00Z'),
  ...overrides,
});

describe('matchOffers', () => {
  it('offers a released range to the oldest matching entry only', () => {
    const offers = matchOffers(released, [
      candidate({ id: NEWER, createdAt: new Date('2026-08-05T00:00:00Z') }),
      candidate({ id: OLDER, createdAt: new Date('2026-08-01T00:00:00Z') }),
    ]);

    expect(offers).toHaveLength(1);
    expect(offers[0]?.entryId).toBe(OLDER);
  });

  it('skips entries whose usable overlap is shorter than their minimum duration', () => {
    const offers = matchOffers(released, [
      candidate({ desired: { start: T0 + HOUR + 30 * 60_000, end: T0 + 4 * HOUR }, minDurationMinutes: 60 }),
    ]);

    expect(offers).toHaveLength(0);
  });

  it('matches court-specific entries only on that court', () => {
    const offers = matchOffers(released, [
      candidate({ id: WRONG_COURT, courtId: C9 }),
      candidate({ id: RIGHT_COURT, courtId: C1, createdAt: new Date('2026-08-06T00:00:00Z') }),
    ]);

    expect(offers).toHaveLength(1);
    expect(offers[0]?.entryId).toBe(RIGHT_COURT);
  });

  it('matches venue-wide entries against any court at the venue', () => {
    const offers = matchOffers(released, [candidate({ venueId: V1, courtId: null })]);

    expect(offers).toHaveLength(1);
    expect(offers[0]?.courtId).toBe(C1);
  });

  it('never offers one entry twice across multiple released ranges', () => {
    const twoRanges: ReleasedRange[] = [
      ...released,
      { courtId: C2, venueId: V1, interval: { start: T0, end: T0 + 2 * HOUR } },
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
