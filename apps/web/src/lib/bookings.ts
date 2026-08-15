import type { BookingSummary } from '@courte/contract';

export const BOOKING_PERIODS = ['upcoming', 'past'] as const;

export type BookingPeriod = (typeof BOOKING_PERIODS)[number];

export const isBookingPeriod = (value: string | undefined): value is BookingPeriod =>
  BOOKING_PERIODS.includes(value as BookingPeriod);

/**
 * Split on the END of play, not the start. A booking that began an hour ago is still the one
 * you are standing on a court for, and moving it to "past" mid-game would be wrong at exactly
 * the moment someone is most likely to be checking their phone for it.
 */
export const filterBookingsByPeriod = (
  bookings: BookingSummary[],
  period: BookingPeriod,
  now: number
): BookingSummary[] =>
  bookings.filter(booking => {
    const hasEnded = Date.parse(booking.playEndIso) <= now;
    return period === 'past' ? hasEnded : !hasEnded;
  });

/**
 * The booking to put at the top of the screen: the soonest one still ahead that has not been
 * cancelled. A cancelled booking is not something you are about to play, however near it is.
 */
export const findNextBooking = (bookings: BookingSummary[], now: number): BookingSummary | null => {
  const live = bookings.filter(
    booking => Date.parse(booking.playEndIso) > now && (booking.status === 'confirmed' || booking.status === 'pending')
  );

  return (
    live.reduce<BookingSummary | null>((soonest, booking) => {
      if (!soonest) return booking;
      return Date.parse(booking.playStartIso) < Date.parse(soonest.playStartIso) ? booking : soonest;
    }, null) ?? null
  );
};
