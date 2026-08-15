import { Injectable } from '@nestjs/common';
import type {
  AddBlackoutBody,
  AddVenueMemberBody,
  RecordPaymentBody,
  RecordPaymentResponse,
  RecordWalkInBody,
  RecordWalkInResponse,
  VenueDashboardResponse,
  VenueMembershipSummary,
  VenueStaffMember,
} from '@courte/contract';
import { DateTime } from 'luxon';

import { findCourtById, findCourtsByVenue } from '@/db/repositories/courtRepository';
import {
  countVenueOwners,
  deleteVenueMember,
  findUserIdByEmail,
  findVenueMembershipSummaries,
  findVenueStaff,
  membershipReader,
  upsertVenueMember,
} from '@/db/repositories/membershipRepository';
import { findPriceRulesForCourts } from '@/db/repositories/priceRuleRepository';
import {
  findVenueBookings,
  getVenueRevenueByDay,
  getVenueStats,
  getVenueUtilisationByHour,
  insertBlackout,
  insertVenuePayment,
  insertWalkInBooking,
  markBookingNoShow,
  type VenueBooking,
} from '@/db/repositories/venueDashboardRepository';
import { findVenueSummary } from '@/db/repositories/venueRepository';
import { buildTrend } from '@/domain/analytics/buildTrend';
import { assertOwnerRemains } from '@/domain/authz/assertOwnerRemains';
import { requireVenueAction } from '@/domain/authz/venueAccess';
import { NotFoundError, SlotUnavailableError, ValidationError } from '@/domain/errors';
import { resolveQuote } from '@/domain/pricing/resolveQuote';

const DASHBOARD_WINDOW_HOURS = 24;

/** How far back the utilisation chart looks. A month smooths out a single quiet Tuesday. */
const UTILISATION_WINDOW_DAYS = 30;

/** The revenue chart's span. Same month, so the two charts describe the same period. */
const REVENUE_WINDOW_DAYS = 30;

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
    const membership = await requireVenueAction(membershipReader, userId, venueId, 'viewBookings');

    const venue = await findVenueSummary(venueId);
    if (!venue) throw new NotFoundError('Venue');

    // Every boundary is venue-local. "Bookings today" on UTC edges would report the wrong day
    // for any venue that is not on UTC, which is all of them.
    const anchor = fromIso ? DateTime.fromISO(fromIso).setZone(venue.timezone) : DateTime.now().setZone(venue.timezone);
    const from = anchor.toJSDate();
    const to = toIso ? new Date(toIso) : anchor.plus({ hours: DASHBOARD_WINDOW_HOURS }).toJSDate();
    const dayStart = anchor.startOf('day');

    const previousDayStart = dayStart.minus({ days: 1 });
    const previousMonthStart = anchor.startOf('month').minus({ months: 1 });

    const [bookings, stats, previousStats, courts, utilisationByHour, revenueByDay] = await Promise.all([
      findVenueBookings(venueId, from, to),
      getVenueStats(
        venueId,
        dayStart.toJSDate(),
        dayStart.plus({ days: 1 }).toJSDate(),
        dayStart.plus({ days: 7 }).toJSDate(),
        anchor.startOf('month').toJSDate()
      ),
      // The same query over the window before this one, rather than a second query that could
      // drift from the first. Yesterday against today, the previous week against the next, and
      // last month against this one — each figure compared with its own equal-length predecessor.
      getVenueStats(
        venueId,
        previousDayStart.toJSDate(),
        dayStart.toJSDate(),
        previousDayStart.plus({ days: 7 }).toJSDate(),
        previousMonthStart.toJSDate()
      ),
      findCourtsByVenue(venueId),
      // A month back, so the shape of a week is visible without one quiet day distorting it.
      getVenueUtilisationByHour(
        venueId,
        dayStart.minus({ days: UTILISATION_WINDOW_DAYS }).toJSDate(),
        dayStart.plus({ days: 1 }).toJSDate(),
        venue.timezone
      ),
      getVenueRevenueByDay(
        venueId,
        dayStart.minus({ days: REVENUE_WINDOW_DAYS - 1 }).toJSDate(),
        dayStart.plus({ days: 1 }).toJSDate(),
        venue.timezone
      ),
    ]);

    return {
      venueId: venue.id,
      venueName: venue.name,
      venueTimezone: venue.timezone,
      role: membership.role,
      stats,
      trends: {
        bookingsToday: buildTrend(stats.bookingsToday, previousStats.bookingsToday),
        upcomingWeek: buildTrend(stats.upcomingWeek, previousStats.upcomingWeek),
        collectedThisMonthCents: buildTrend(
          stats.collectedThisMonthCents,
          // The month figure's predecessor is last month's total, which is the previous read's
          // "collected since month start" counted from the previous month start.
          previousStats.collectedThisMonthCents - stats.collectedThisMonthCents
        ),
      },
      revenueByDay,
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

  async listStaff(userId: number, venueId: number): Promise<VenueStaffMember[]> {
    const membership = await requireVenueAction(membershipReader, userId, venueId, 'manageStaff');
    const staff = await findVenueStaff(venueId);

    return staff.map(member => ({ ...member, isSelf: member.userId === membership.userId }));
  }

  /**
   * Added by email, because that is what an owner knows about the person they are hiring.
   *
   * An address that has never signed in is refused rather than creating a shell "User" row:
   * that row would be an account nobody controls, and whoever first signed in with the address
   * would silently inherit whatever it had been granted.
   */
  async addStaff(userId: number, venueId: number, body: AddVenueMemberBody): Promise<void> {
    await requireVenueAction(membershipReader, userId, venueId, 'manageStaff');

    const invitedId = await findUserIdByEmail(body.email);
    if (!invitedId) {
      throw new ValidationError('Nobody has signed in with that email yet. Ask them to sign in once first.', [
        { field: 'email', message: 'no account with that address' },
      ]);
    }

    // This is an upsert, so it is also the DEMOTION path: posting the sole owner's own email
    // with role 'staff' rewrites their row and leaves a venue nobody can administer. Easy to
    // miss on a method named for adding, which is why the rule lives in one shared function.
    const existing = await membershipReader.findMembership(invitedId, venueId);
    assertOwnerRemains({
      currentRole: existing?.role ?? null,
      nextRole: body.role,
      ownerCount: await countVenueOwners(venueId),
    });

    await upsertVenueMember(venueId, invitedId, body.role);
  }

  /**
   * Two refusals, and both are about locking somebody out of something they cannot get back.
   *
   * Removing the last owner leaves a venue nobody can administer — no way to add a court, set a
   * price, or appoint a replacement owner. And an owner removing themselves does the same thing
   * one step slower, so it is refused separately with a message that says what to do instead.
   *
   * The self-check makes the last-owner branch unreachable from here today, since a caller who
   * can reach this is by definition an owner. It stays because `addStaff` shares the rule and
   * can reach it, and because the day a transfer-ownership path exists it will reach it too.
   */
  async removeStaff(userId: number, venueId: number, memberId: number): Promise<void> {
    const membership = await requireVenueAction(membershipReader, userId, venueId, 'manageStaff');

    if (memberId === membership.userId) {
      throw new ValidationError('You cannot remove yourself. Ask another owner to do it.');
    }

    const target = await membershipReader.findMembership(memberId, venueId);
    if (!target) throw new NotFoundError('Staff member');

    assertOwnerRemains({
      currentRole: target.role,
      nextRole: null,
      ownerCount: await countVenueOwners(venueId),
    });

    const removed = await deleteVenueMember(venueId, memberId);
    if (!removed) throw new NotFoundError('Staff member');
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
