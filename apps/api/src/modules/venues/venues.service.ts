import { Injectable } from '@nestjs/common';
import type {
  AddBlackoutBody,
  RecordPaymentBody,
  RecordPaymentResponse,
  RecordWalkInBody,
  RecordWalkInResponse,
  VenueDashboardResponse,
  VenueMembershipSummary,
} from '@courte/contract';
import { DateTime } from 'luxon';

import { findCourtById, findCourtsByVenue } from '@/db/repositories/courtRepository';
import { findVenueMembershipSummaries, membershipReader } from '@/db/repositories/membershipRepository';
import { findPriceRulesForCourts } from '@/db/repositories/priceRuleRepository';
import {
  findVenueBookings,
  getVenueStats,
  getVenueUtilisationByHour,
  insertBlackout,
  insertVenuePayment,
  insertWalkInBooking,
  type VenueBooking,
} from '@/db/repositories/venueDashboardRepository';
import { findVenueSummary } from '@/db/repositories/venueRepository';
import { requireVenueAction } from '@/domain/authz/venueAccess';
import { NotFoundError, SlotUnavailableError, ValidationError } from '@/domain/errors';
import { resolveQuote } from '@/domain/pricing/resolveQuote';

const DASHBOARD_WINDOW_HOURS = 24;

/** How far back the utilisation chart looks. A month smooths out a single quiet Tuesday. */
const UTILISATION_WINDOW_DAYS = 30;

/**
 * Desk operations. Every method re-checks venue membership for itself through
 * requireVenueAction — a route guard protects routing, never the action, and authorization
 * belongs at the point of access.
 */
@Injectable()
export class VenuesService {
  listMemberships(userId: number): Promise<VenueMembershipSummary[]> {
    return findVenueMembershipSummaries(userId);
  }

  async getDashboard(
    userId: number,
    venueId: number,
    fromIso: string | undefined,
    toIso: string | undefined
  ): Promise<VenueDashboardResponse> {
    await requireVenueAction(membershipReader, userId, venueId, 'viewBookings');

    const venue = await findVenueSummary(venueId);
    if (!venue) throw new NotFoundError('Venue');

    // Every boundary is venue-local. "Bookings today" on UTC edges would report the wrong day
    // for any venue that is not on UTC, which is all of them.
    const anchor = fromIso ? DateTime.fromISO(fromIso).setZone(venue.timezone) : DateTime.now().setZone(venue.timezone);
    const from = anchor.toJSDate();
    const to = toIso ? new Date(toIso) : anchor.plus({ hours: DASHBOARD_WINDOW_HOURS }).toJSDate();
    const dayStart = anchor.startOf('day');

    const [bookings, stats, courts, utilisationByHour] = await Promise.all([
      findVenueBookings(venueId, from, to),
      getVenueStats(
        venueId,
        dayStart.toJSDate(),
        dayStart.plus({ days: 1 }).toJSDate(),
        dayStart.plus({ days: 7 }).toJSDate(),
        anchor.startOf('month').toJSDate()
      ),
      findCourtsByVenue(venueId),
      // A month back, so the shape of a week is visible without one quiet day distorting it.
      getVenueUtilisationByHour(
        venueId,
        dayStart.minus({ days: UTILISATION_WINDOW_DAYS }).toJSDate(),
        dayStart.plus({ days: 1 }).toJSDate(),
        venue.timezone
      ),
    ]);

    return {
      venueId: venue.id,
      venueName: venue.name,
      venueTimezone: venue.timezone,
      stats,
      bookings: bookings.map(booking => this.toBookingRow(booking)),
      courts: courts.map(court => ({ id: court.id, name: court.name })),
      utilisationByHour,
    };
  }

  async recordWalkIn(userId: number, venueId: number, body: RecordWalkInBody): Promise<RecordWalkInResponse> {
    const membership = await requireVenueAction(membershipReader, userId, venueId, 'recordWalkIn');
    const court = await this.findCourtInVenue(body.courtId, venueId);

    const playStart = new Date(body.startIso);
    const playEnd = new Date(playStart.getTime() + body.durationMinutes * 60_000);

    const [rules, venue] = await Promise.all([findPriceRulesForCourts([court.id]), findVenueSummary(venueId)]);
    if (!venue) throw new NotFoundError('Venue');

    const quote = resolveQuote({
      rules,
      requested: { start: playStart.getTime(), end: playEnd.getTime() },
      timezone: venue.timezone,
      isMember: false,
    });

    const outcome = await insertWalkInBooking({
      venueId,
      courtId: court.id,
      customerName: body.customerName,
      recordedBy: membership.userId,
      source: body.source,
      playStart,
      playEnd,
      bufferMinutes: court.bufferMinutes,
      totalCents: quote.totalCents,
      rateSnapshot: quote.snapshot,
    });

    // The same lost race the exclusion constraint arbitrates online, surfaced at the desk.
    if (outcome.status === 'conflict') throw new SlotUnavailableError('That court is already taken for that time');

    return { bookingId: outcome.bookingId, totalCents: quote.totalCents };
  }

  async addBlackout(userId: number, venueId: number, body: AddBlackoutBody): Promise<void> {
    await requireVenueAction(membershipReader, userId, venueId, 'blockCourt');
    const court = await this.findCourtInVenue(body.courtId, venueId);

    const outcome = await insertBlackout({
      courtId: court.id,
      reason: body.reason,
      start: new Date(body.startIso),
      end: new Date(body.endIso),
    });

    if (outcome === 'conflict') {
      throw new SlotUnavailableError('Existing bookings overlap that period — cancel or move them first');
    }
  }

  async recordPayment(userId: number, venueId: number, body: RecordPaymentBody): Promise<RecordPaymentResponse> {
    const membership = await requireVenueAction(membershipReader, userId, venueId, 'recordPayment');

    const amountCents = Math.round(body.amountPesos * 100);
    if (amountCents <= 0)
      throw new ValidationError('Invalid input', [{ field: 'amountPesos', message: 'must be positive' }]);

    const recorded = await insertVenuePayment({
      bookingId: body.bookingId,
      venueId,
      amountCents,
      method: body.method,
      recordedBy: membership.userId,
    });

    // Scoped to the venue in the query, so another venue's booking id is simply not found.
    if (!recorded) throw new NotFoundError('Booking');

    return { bookingId: body.bookingId, method: body.method, amountCents };
  }

  /** A court id from another venue is indistinguishable from a missing one. */
  private async findCourtInVenue(courtId: number, venueId: number) {
    const court = await findCourtById(courtId);
    if (!court || court.venueId !== venueId) throw new NotFoundError('Court');
    return court;
  }

  private toBookingRow(booking: VenueBooking): VenueDashboardResponse['bookings'][number] {
    return {
      id: booking.id,
      courtName: booking.courtName,
      customer: booking.customer,
      status: booking.status,
      source: booking.source,
      totalCents: booking.totalCents,
      paidCents: booking.paidCents,
      paymentState: booking.paymentState,
      playStartIso: booking.playStart.toISOString(),
      playEndIso: booking.playEnd.toISOString(),
    };
  }
}
