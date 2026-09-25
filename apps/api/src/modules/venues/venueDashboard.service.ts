import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';

import type { VenueDashboardResponse, VenueMembershipSummary } from '@courte/contract';

import { findCourtsByVenue } from '@/db/repositories/courtRepository';
import { findVenueMembershipSummaries, membershipReader } from '@/db/repositories/membershipRepository';
import {
  findVenueBookings,
  getVenueRevenueByDay,
  getVenueStats,
  getVenueUtilisationByHour,
  type VenueBooking,
} from '@/db/repositories/venueDashboardRepository';
import { findVenueSummary } from '@/db/repositories/venueRepository';
import { buildTrend } from '@/domain/analytics/buildTrend';
import { requireVenueAction } from '@/domain/authz/venueAccess';
import { NotFoundError } from '@/domain/errors';

const DASHBOARD_WINDOW_HOURS = 24;

/** How far back the utilisation chart looks. A month smooths out a single quiet Tuesday. */
const UTILISATION_WINDOW_DAYS = 30;

/** The revenue chart's span. Same month, so the two charts describe the same period. */
const REVENUE_WINDOW_DAYS = 30;

/**
 * What the owner reads: memberships and the dashboard. Split from the desk and from staff
 * admin because it only ever reads — nothing here changes what the venue sells — and because
 * it is the only one of the three that carries the analytics windows.
 *
 * Every method re-checks venue membership for itself through requireVenueAction: a route guard
 * protects routing, never the action, and authorization belongs at the point of access.
 */
@Injectable()
export class VenueDashboardService {
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
