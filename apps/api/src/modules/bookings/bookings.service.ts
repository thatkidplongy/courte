import { Injectable } from '@nestjs/common';
import type { BookingSummary, Paginated, PlaceHoldBody, PlaceHoldResponse } from '@courte/contract';

import { env } from '@/config/env';
import { query, withTransaction } from '@/db/client';
import { isOverlapViolation } from '@/db/errors';
import * as bookings from '@/db/repositories/bookingRepository';
import type { BookingDetail } from '@/db/repositories/bookingRepository';
import { findCourtById } from '@/db/repositories/courtRepository';
import { findPriceRulesForCourts } from '@/db/repositories/priceRuleRepository';
import * as reservations from '@/db/repositories/reservationRepository';
import { findVenueTimezones } from '@/db/repositories/venueRepository';
import { doesSlotFit } from '@/domain/availability/getAvailability';
import {
  cancelBooking as cancelWorkflow,
  confirmBooking as confirmWorkflow,
  placeHold as placeHoldWorkflow,
} from '@/domain/booking/bookingService';
import { assertCancellable } from '@/domain/booking/cancellationPolicy';
import { assertDurationAllowed } from '@/domain/booking/durationPolicy';
import { NotFoundError, OutsideOpeningHoursError } from '@/domain/errors';
import { resolveQuote } from '@/domain/pricing/resolveQuote';
import { offerReleasedRanges } from '@/jobs/offerReleasedRanges';
import { getAvailabilityForCourts } from '@/services/availabilityService';

const workflowDeps = { bookings, reservations, withTransaction, isOverlapViolation };

@Injectable()
export class BookingsService {
  /**
   * The checkout entry point. Deliberately no availability pre-check for *conflicts* — the
   * exclusion constraint arbitrates races (docs/adr/0002); the opening-hours check here is
   * about hours, which change by owner edit, not by race.
   */
  async placeHold(userId: number, body: PlaceHoldBody): Promise<PlaceHoldResponse> {
    const court = await findCourtById(body.courtId);
    if (!court) throw new NotFoundError('Court');

    assertDurationAllowed(court, body.durationMinutes);

    const start = new Date(body.startIso);
    const end = new Date(start.getTime() + body.durationMinutes * 60_000);
    const requested = { start: start.getTime(), end: end.getTime() };

    const availability = await getAvailabilityForCourts([court], requested);
    const courtAvailability = availability.get(court.id);
    if (!courtAvailability || !doesSlotFit({ availability: courtAvailability, requested })) {
      throw new OutsideOpeningHoursError('That time is not available on this court');
    }

    const [rules, timezones] = await Promise.all([
      findPriceRulesForCourts([court.id]),
      findVenueTimezones([court.venueId]),
    ]);
    const timezone = timezones.get(court.venueId);
    if (!timezone) throw new NotFoundError('Venue');

    const quote = resolveQuote({ rules, requested, timezone, isMember: false });
    const now = new Date();

    const result = await placeHoldWorkflow(workflowDeps, {
      userId,
      court: { id: court.id, venueId: court.venueId, bufferMinutes: court.bufferMinutes },
      slots: [{ courtId: court.id, start, end }],
      quote,
      source: 'online',
      holdTtlMinutes: env.HOLD_TTL_MINUTES,
      now,
    });

    return {
      bookingId: result.bookingId,
      holdExpiresAtIso: new Date(now.getTime() + env.HOLD_TTL_MINUTES * 60_000).toISOString(),
      totalCents: quote.totalCents,
    };
  }

  async confirmBooking(userId: number, bookingId: number): Promise<void> {
    await confirmWorkflow(workflowDeps, { bookingId, userId });
  }

  async cancelBooking(userId: number, bookingId: number): Promise<void> {
    const policy = await this.findCancellationPolicy(bookingId, userId);

    await cancelWorkflow(workflowDeps, {
      bookingId,
      userId,
      assertInsideCancellationWindow: () =>
        assertCancellable({
          bookingStart: policy.bookingStart,
          cancellationWindowMinutes: policy.windowMinutes,
          now: new Date(),
          isVenueStaff: false,
        }),
      onReleased: async released => {
        await offerReleasedRanges(released);
      },
    });
  }

  async getBookingDetail(userId: number, bookingId: number): Promise<BookingSummary> {
    const booking = await bookings.findBookingDetailForUser(bookingId, userId);
    if (!booking) throw new NotFoundError('Booking');
    return this.toSummary(booking);
  }

  async listBookings(userId: number, page: number, limit: number): Promise<Paginated<BookingSummary>> {
    const { bookings: details, total } = await bookings.findBookingDetailPageForUser(userId, page, limit);

    return {
      data: details.map(detail => this.toSummary(detail)),
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  /**
   * First play start and the venue's window, scoped to the caller: someone else's booking id
   * finds no row here and surfaces as the same 404 a made-up id would.
   */
  private async findCancellationPolicy(
    bookingId: number,
    userId: number
  ): Promise<{ bookingStart: Date; windowMinutes: number }> {
    const rows = await query<{ first_play: string; window_minutes: number }>(
      `
      SELECT min(lower(r.play_during))::text AS first_play,
             (EXTRACT(EPOCH FROM v.cancellation_window) / 60)::int AS window_minutes
      FROM "Booking" b
      JOIN "Venue" v ON v.id = b.venue_id
      JOIN "Reservation" r ON r.booking_id = b.id AND r.state = 'active'
      WHERE b.id = $1 AND b.user_id = $2
      GROUP BY v.cancellation_window
      `,
      [bookingId, userId]
    );

    const policy = rows[0];
    if (!policy) throw new NotFoundError('Booking');

    return { bookingStart: new Date(policy.first_play), windowMinutes: policy.window_minutes };
  }

  private toSummary(booking: BookingDetail): BookingSummary {
    return {
      id: booking.id,
      seriesId: booking.seriesId,
      venueId: booking.venueId,
      status: booking.status,
      source: booking.source,
      totalCents: booking.totalCents,
      paidCents: booking.paidCents,
      paymentState: booking.paymentState,
      cancelledAtIso: booking.cancelledAt?.toISOString() ?? null,
      createdAtIso: booking.createdAt.toISOString(),
      courtNames: booking.courtNames,
      venueName: booking.venueName,
      venueTimezone: booking.venueTimezone,
      playStartIso: booking.playStart.toISOString(),
      playEndIso: booking.playEnd.toISOString(),
      holdExpiresAtIso: booking.holdExpiresAt?.toISOString() ?? null,
    };
  }
}
