import { HoldExpiredError, NotFoundError, SlotUnavailableError } from '@/domain/errors';

import type {
  BookingWorkflowDeps,
  CancelBookingParams,
  ConfirmBookingParams,
  HoldResult,
  PlaceHoldParams,
} from './types';

/**
 * The booking workflow, HTTP-agnostic (nothing here betrays that a web app calls it) and
 * database-agnostic (repositories arrive as an argument, per docs/adr/0003). The overlap
 * decision itself is delegated to the reservations exclusion constraint — this service's job
 * is the orchestration around it, not the check.
 */

export const placeHold = async (deps: BookingWorkflowDeps, params: PlaceHoldParams): Promise<HoldResult> => {
  const { bufferMinutes } = params.court;
  const bufferMs = bufferMinutes * 60_000;

  const expiresAt = new Date(params.now.getTime() + params.holdTtlMinutes * 60_000);

  try {
    return await deps.withTransaction(async tx => {
      const bookingId = await deps.bookings.insertPendingBooking(tx, {
        userId: params.userId,
        venueId: params.court.venueId,
        source: params.source,
        totalCents: params.quote.totalCents,
        rateSnapshot: params.quote.snapshot,
      });

      // One reservation per court, all or nothing: a tournament that clashes on one court
      // books zero courts. The buffer widens what the constraint sees, not what the player gets.
      for (const slot of params.slots) {
        await deps.reservations.insertReservation(tx, {
          courtId: slot.courtId,
          bookingId,
          kind: 'hold',
          duringStart: new Date(slot.start.getTime() - bufferMs),
          duringEnd: new Date(slot.end.getTime() + bufferMs),
          playStart: slot.start,
          playEnd: slot.end,
          expiresAt,
        });
      }

      return { bookingId, expiresAt };
    });
  } catch (error) {
    // The expected outcome of a lost race — somebody else committed first. Nothing was
    // written (the transaction rolled back), so there is nothing to clean up.
    if (deps.isOverlapViolation(error)) throw new SlotUnavailableError();
    throw error;
  }
};

export const confirmBooking = async (deps: BookingWorkflowDeps, params: ConfirmBookingParams): Promise<void> => {
  const booking = await deps.bookings.findBookingForUser(params.bookingId, params.userId);
  if (!booking) throw new NotFoundError('Booking');
  if (booking.status !== 'pending') throw new NotFoundError('Booking');

  await deps.withTransaction(async tx => {
    const promoted = await deps.reservations.promoteHoldsToBooking(tx, params.bookingId);

    // Zero promotions means the sweeper got there first: the hold lapsed and its range may
    // already belong to someone else. The booking is dead, and saying so beats a silent retry.
    if (promoted === 0) {
      await deps.bookings.updateBookingStatus(tx, params.bookingId, 'cancelled');
      throw new HoldExpiredError();
    }

    await deps.bookings.updateBookingStatus(tx, params.bookingId, 'confirmed');
  });
};

export const cancelBooking = async (deps: BookingWorkflowDeps, params: CancelBookingParams): Promise<void> => {
  const booking = await deps.bookings.findBookingForUser(params.bookingId, params.userId);
  if (!booking) throw new NotFoundError('Booking');
  if (booking.status !== 'confirmed' && booking.status !== 'pending') throw new NotFoundError('Booking');

  params.assertInsideCancellationWindow(booking);

  const released = await deps.withTransaction(async tx => {
    await deps.bookings.updateBookingStatus(tx, params.bookingId, 'cancelled');
    return deps.reservations.releaseReservationsForBooking(tx, params.bookingId);
  });

  // Waitlist offers happen after commit: an offer for a range that then failed to release
  // would be a lie, so the release must be durable first.
  await params.onReleased(released);
};
