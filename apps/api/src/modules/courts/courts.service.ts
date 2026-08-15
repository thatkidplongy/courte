import { Injectable } from '@nestjs/common';
import {
  SEARCH_DEFAULTS,
  type CourtAvailabilityResponse,
  type CourtSearchItem,
  type Paginated,
  type SearchCourtsQuery,
  type VenueScheduleResponse,
} from '@courte/contract';
import { DateTime } from 'luxon';

import { MAX_SLOTS_PER_DAY, SLOT_CHIPS_PER_CARD } from '@/consts';
import { findCourtById, searchCourtsByProximity, type CourtSearchResult } from '@/db/repositories/courtRepository';
import { findVenueTimezones } from '@/db/repositories/venueRepository';
import { listStartTimes } from '@/domain/availability/listStartTimes';
import { NotFoundError } from '@/domain/errors';
import { getAvailabilityForCourts } from '@/services/availabilityService';
import { getVenueSchedule } from '@/services/venueScheduleService';

/**
 * Services hold orchestration and know nothing about HTTP. Nothing in this file mentions a
 * status code, a request or a response — from a glance you cannot tell it backs an API.
 */
@Injectable()
export class CourtsService {
  async searchCourts(query: SearchCourtsQuery): Promise<Paginated<CourtSearchItem>> {
    // The search grid spans one market, so the day boundary comes from the market's zone;
    // each card still reports its own venue timezone for rendering.
    const day = this.resolveDay(query.date, SEARCH_DEFAULTS.timezone);
    const range = { start: day.toMillis(), end: day.plus({ days: 1 }).toMillis() };

    const { courts, total } = await searchCourtsByProximity({
      sport: query.sport,
      surface: query.surface,
      amenitySlugs: query.amenities,
      minRatePerHourCents: query.minRatePerHourCents,
      maxRatePerHourCents: query.maxRatePerHourCents,
      sort: query.sort,
      longitude: query.longitude,
      latitude: query.latitude,
      radiusMetres: query.radiusMetres,
      page: query.page,
      limit: query.limit,
    });

    // One bulk query for the whole page, never one per card — see the N+1 rule. The cheapest
    // public rate already came back with the search, since the query filters and sorts on it.
    const availability = await getAvailabilityForCourts(courts, range);

    const now = Date.now();
    const data = courts.map(court =>
      this.toSearchItem({
        court,
        freeIntervals: availability.get(court.id)?.free ?? [],
        notBefore: now,
      })
    );

    return {
      data,
      total,
      page: query.page,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    };
  }

  getVenueSchedule(courtId: string, date: string | undefined): Promise<VenueScheduleResponse> {
    return getVenueSchedule(courtId, date);
  }

  async getAvailability(courtId: string, date: string | undefined): Promise<CourtAvailabilityResponse> {
    const court = await findCourtById(courtId);
    if (!court) throw new NotFoundError('Court');

    const timezone = (await findVenueTimezones([court.venueId])).get(court.venueId);
    if (!timezone) throw new NotFoundError('Venue');

    const day = this.resolveDay(date, timezone);
    const range = { start: day.toMillis(), end: day.plus({ days: 1 }).toMillis() };
    const availability = await getAvailabilityForCourts([court], range);

    const slotStarts = listStartTimes({
      free: availability.get(court.id)?.free ?? [],
      durationMinutes: court.minDurationMinutes,
      incrementMinutes: court.incrementMinutes,
      notBefore: Date.now(),
      limit: MAX_SLOTS_PER_DAY,
    });

    return {
      id: court.id,
      name: court.name,
      sport: court.sport,
      surface: court.surface,
      venueId: court.venueId,
      venueTimezone: timezone,
      minDurationMinutes: court.minDurationMinutes,
      maxDurationMinutes: court.maxDurationMinutes,
      incrementMinutes: court.incrementMinutes,
      dayStartIso: day.toUTC().toISO() ?? new Date(range.start).toISOString(),
      dayEndIso: day.plus({ days: 1 }).toUTC().toISO() ?? new Date(range.end).toISOString(),
      slotStartIsos: slotStarts.map(start => new Date(start).toISOString()),
    };
  }

  /**
   * An absent or unparseable date means "today in the venue's zone". Callers get a usable
   * result rather than a validation error for a query parameter they never set.
   */
  private resolveDay(date: string | undefined, timezone: string): DateTime {
    if (!date) return DateTime.now().setZone(timezone).startOf('day');

    const parsed = DateTime.fromISO(date, { zone: timezone }).startOf('day');
    return parsed.isValid ? parsed : DateTime.now().setZone(timezone).startOf('day');
  }

  private toSearchItem({
    court,
    freeIntervals,
    notBefore,
  }: {
    court: CourtSearchResult;
    freeIntervals: Array<{ start: number; end: number }>;
    notBefore: number;
  }): CourtSearchItem {
    const slotStarts = listStartTimes({
      free: freeIntervals,
      durationMinutes: court.minDurationMinutes,
      incrementMinutes: court.incrementMinutes,
      notBefore,
      limit: SLOT_CHIPS_PER_CARD,
    });

    return {
      id: court.id,
      name: court.name,
      sport: court.sport,
      surface: court.surface,
      venueId: court.venueId,
      venueName: court.venueName,
      venueAddress: court.venueAddress,
      venueTimezone: court.venueTimezone,
      venueCourtCount: court.venueCourtCount,
      venueAmenitySlugs: court.venueAmenitySlugs,
      venuePhoto: court.venuePhoto,
      latitude: court.latitude,
      longitude: court.longitude,
      distanceMetres: court.distanceMetres,
      minDurationMinutes: court.minDurationMinutes,
      maxDurationMinutes: court.maxDurationMinutes,
      incrementMinutes: court.incrementMinutes,
      fromRatePerHourCents: court.fromRatePerHourCents,
      slotStartIsos: slotStarts.map(start => new Date(start).toISOString()),
    };
  }
}
