import { DateTime } from 'luxon';
import { describe, expect, it } from 'vitest';

import { ValidationError } from '@/domain/errors';

import { assertWindowsCoverBookings, findUncoveredSlots } from './assertWindowsCoverBookings';

const MANILA = 'Asia/Manila';
const at = (iso: string): number => DateTime.fromISO(iso, { zone: MANILA }).toMillis();

/** 2026-08-10 is a Monday, which is dayOfWeek 0. */
const MONDAY = '2026-08-10';

/** Open 08:00 for 14 hours — to 22:00 — every day. */
const wideHours = Array.from({ length: 7 }, (_, day) => ({
  courtId: 'court-1',
  dayOfWeek: day,
  startsAt: '08:00',
  durationMinutes: 840,
}));

/** The same week shortened to close at 19:00. */
const shortHours = wideHours.map(window => ({ ...window, durationMinutes: 660 }));

const slot = (from: string, to: string, bookingId = 'b1') => ({
  bookingId,
  start: at(`${MONDAY}T${from}`),
  end: at(`${MONDAY}T${to}`),
});

describe('findUncoveredSlots', () => {
  it('finds nothing when every booking sits inside the hours', () => {
    expect(findUncoveredSlots({ windows: wideHours, timezone: MANILA, slots: [slot('10:00', '11:00')] })).toEqual([]);
  });

  it('has nothing to check when there are no bookings', () => {
    expect(findUncoveredSlots({ windows: shortHours, timezone: MANILA, slots: [] })).toEqual([]);
  });

  it('flags a booking that would fall outside shortened hours', () => {
    const uncovered = findUncoveredSlots({
      windows: shortHours,
      timezone: MANILA,
      slots: [slot('20:00', '21:00', 'evening')],
    });

    expect(uncovered.map(s => s.bookingId)).toEqual(['evening']);
  });

  /** Partially outside is outside — the venue would be shut halfway through the game. */
  it('flags a booking that only straddles the new closing time', () => {
    const uncovered = findUncoveredSlots({
      windows: shortHours,
      timezone: MANILA,
      slots: [slot('18:30', '19:30', 'straddles')],
    });

    expect(uncovered.map(s => s.bookingId)).toEqual(['straddles']);
  });

  it('keeps the ones that still fit and drops only those that do not', () => {
    const uncovered = findUncoveredSlots({
      windows: shortHours,
      timezone: MANILA,
      slots: [slot('10:00', '11:00', 'morning'), slot('20:00', '21:00', 'evening')],
    });

    expect(uncovered.map(s => s.bookingId)).toEqual(['evening']);
  });

  it('flags everything when the day is removed altogether', () => {
    const noMonday = wideHours.filter(window => window.dayOfWeek !== 0);

    const uncovered = findUncoveredSlots({
      windows: noMonday,
      timezone: MANILA,
      slots: [slot('10:00', '11:00', 'orphan')],
    });

    expect(uncovered.map(s => s.bookingId)).toEqual(['orphan']);
  });
});

describe('assertWindowsCoverBookings', () => {
  it('says nothing when the hours still cover everything sold', () => {
    expect(() =>
      assertWindowsCoverBookings({ windows: wideHours, timezone: MANILA, slots: [slot('10:00', '11:00')] })
    ).not.toThrow();
  });

  it('refuses, counting the slots and naming when they are', () => {
    const call = () =>
      assertWindowsCoverBookings({ windows: shortHours, timezone: MANILA, slots: [slot('20:00', '21:00')] });

    expect(call).toThrow(ValidationError);
    expect(call).toThrow(/1 booked slot/);
    expect(call).toThrow(/20:00/);
  });

  /** A long list is summarised rather than dumped into a sentence nobody will read. */
  it('names the first few and counts the rest', () => {
    const slots = Array.from({ length: 5 }, (_, index) => slot('20:00', '21:00', `b${index}`));

    expect(() => assertWindowsCoverBookings({ windows: shortHours, timezone: MANILA, slots })).toThrow(/and 2 more/);
  });
});
