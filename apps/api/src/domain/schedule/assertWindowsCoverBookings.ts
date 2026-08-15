import { DateTime } from 'luxon';

import { projectWindows } from '@/domain/availability/getAvailability';
import type { Interval, OpeningWindow } from '@/domain/availability/types';
import { ValidationError } from '@/domain/errors';

/**
 * Refuses opening hours that would leave an already-sold booking outside them.
 *
 * Shortening a court's hours is an ordinary thing for an owner to do, and most of the time it
 * is harmless. It is not harmless when somebody has already paid to play at eight and the new
 * hours close at seven: the booking does not disappear, it becomes a slot the venue has sold
 * and no longer admits it is open for. Refusing, and naming the bookings in the way, leaves the
 * owner with a decision to make rather than a quiet inconsistency to discover later.
 *
 * Pure — the caller supplies the bookings it found.
 */

export type SoldSlot = {
  bookingId: number;
  start: number;
  end: number;
};

const isCoveredBy = (open: Interval[], slot: SoldSlot): boolean =>
  open.some(interval => interval.start <= slot.start && interval.end >= slot.end);

/**
 * Windows are projected across the span the bookings actually occupy, padded by a day at each
 * end so a window that wraps past local midnight still lands on the booking it covers.
 */
export const findUncoveredSlots = (params: {
  windows: OpeningWindow[];
  timezone: string;
  slots: SoldSlot[];
}): SoldSlot[] => {
  if (params.slots.length === 0) return [];

  const earliest = Math.min(...params.slots.map(slot => slot.start));
  const latest = Math.max(...params.slots.map(slot => slot.end));
  const range: Interval = {
    start: DateTime.fromMillis(earliest, { zone: params.timezone }).minus({ days: 1 }).toMillis(),
    end: DateTime.fromMillis(latest, { zone: params.timezone }).plus({ days: 1 }).toMillis(),
  };

  const open = projectWindows(params.windows, range, params.timezone);

  return params.slots.filter(slot => !isCoveredBy(open, slot));
};

export const assertWindowsCoverBookings = (params: {
  windows: OpeningWindow[];
  timezone: string;
  slots: SoldSlot[];
}): void => {
  const uncovered = findUncoveredSlots(params);
  if (uncovered.length === 0) return;

  const when = uncovered
    .slice(0, 3)
    .map(slot => DateTime.fromMillis(slot.start, { zone: params.timezone }).toFormat('ccc d LLL, HH:mm'))
    .join('; ');
  const more = uncovered.length > 3 ? ` and ${uncovered.length - 3} more` : '';

  throw new ValidationError(
    `Those hours would leave ${uncovered.length} booked ${uncovered.length === 1 ? 'slot' : 'slots'} ` +
      `outside them (${when}${more}). Move or cancel them first.`
  );
};
