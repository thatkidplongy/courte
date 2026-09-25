import { Injectable } from '@nestjs/common';
import type {
  AddBlackoutBody,
  RecordPaymentBody,
  RecordPaymentResponse,
  RecordWalkInBody,
  RecordWalkInResponse,
} from '@courte/contract';

import { findCourtById } from '@/db/repositories/courtRepository';
import { membershipReader } from '@/db/repositories/membershipRepository';
import { findPriceRulesForCourts } from '@/db/repositories/priceRuleRepository';
import {
  insertBlackout,
  insertVenuePayment,
  insertWalkInBooking,
  markBookingNoShow,
} from '@/db/repositories/venueDashboardRepository';
import { findVenueSummary } from '@/db/repositories/venueRepository';
import { requireVenueAction } from '@/domain/authz/venueAccess';
import { NotFoundError, SlotUnavailableError, ValidationError } from '@/domain/errors';
import { resolveQuote } from '@/domain/pricing/resolveQuote';

/**
 * What happens at the counter: a walk-in, a court blocked off, a payment taken, a no-show
 * recorded. These are writes against today, and they are the venue actions staff can perform
 * as well as owners — which is why they sit apart from staff administration.
 *
 * Every method re-checks venue membership for itself through requireVenueAction: a route guard
 * protects routing, never the action, and authorization belongs at the point of access.
 */
@Injectable()
export class VenueDeskService {
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

  /**
   * The desk's last action of the day. Staff can do this, not just owners — it is a record of
   * what happened at the counter, not a change to what the venue sells.
   *
   * Venue-scoped in the UPDATE, and the status filter is what makes it idempotent-ish: marking
   * an already-cancelled booking finds nothing rather than resurrecting it as a no-show.
   */
  async markNoShow(userId: number, venueId: number, bookingId: number): Promise<void> {
    await requireVenueAction(membershipReader, userId, venueId, 'markNoShow');

    const marked = await markBookingNoShow(venueId, bookingId);
    if (!marked) throw new NotFoundError('Booking');
  }

  /** A court id from another venue is indistinguishable from a missing one. */
  private async findCourtInVenue(courtId: number, venueId: number) {
    const court = await findCourtById(courtId);
    if (!court || court.venueId !== venueId) throw new NotFoundError('Court');
    return court;
  }
}
