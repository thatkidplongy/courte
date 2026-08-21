import { Injectable } from '@nestjs/common';
import {
  SEARCH_DEFAULTS,
  TIME_FILTER_CANDIDATE_CAP,
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
import { canStartAt } from '@/domain/availability/canStartAt';
import { listStartTimes } from '@/domain/availability/listStartTimes';
import type { Interval } from '@/domain/availability/types';
import { buildVenueRating } from '@/domain/reviews/buildVenueRating';
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
    const wantedTime = query.time;

    // A time filter reads a court's real free intervals, which only exist once availability has
    // been derived — after the query. Taking the page in SQL first would page over courts that
    // the filter then removes, so the candidate set is taken whole and paged below instead.
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
      page: wantedTime ? 1 : query.page,
      limit: wantedTime ? TIME_FILTER_CANDIDATE_CAP : query.limit,
    });

    // One bulk query for the whole page, never one per card — see the N+1 rule. The cheapest
    // public rate already came back with the search, since the query filters and sorts on it.
    const availability = await getAvailabilityForCourts(courts, range);

    const now = Date.now();
    const resolved = courts.map(court => ({ court, freeIntervals: availability.get(court.id)?.free ?? [] }));

    if (!wantedTime) {
      return {
        data: resolved.map(entry => this.toSearchItem({ ...entry, notBefore: now })),
        total,
        page: query.page,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
      };
    }

    // The SQL already ordered the candidates, and filtering preserves that order, so the page
    // taken here is the same page the unfiltered search would have shown minus the misses.
    const matching = resolved.filter(entry => this.matchesTime({ ...entry, notBefore: now, day, time: wantedTime }));
    const offset = (query.page - 1) * query.limit;

    return {
      data: matching.slice(offset, offset + query.limit).map(entry => this.toSearchItem({ ...entry, notBefore: now })),
      total: matching.length,
      page: query.page,
      totalPages: Math.max(1, Math.ceil(matching.length / query.limit)),
    };
  }

  private matchesTime({
    court,
    freeIntervals,
    notBefore,
    day,
    time,
  }: {
    court: CourtSearchResult;
    freeIntervals: Interval[];
    notBefore: number;
    day: DateTime;
    time: string;
  }): boolean {
    return canStartAt({
      free: freeIntervals,
      durationMinutes: court.minDurationMinutes,
      incrementMinutes: court.incrementMinutes,
      notBefore,
      date: day.toFormat('yyyy-MM-dd'),
      time,
      timezone: court.venueTimezone,
      limit: MAX_SLOTS_PER_DAY,
    });
  }

  getVenueSchedule(courtId: number, date: string | undefined): Promise<VenueScheduleResponse> {
    return getVenueSchedule(courtId, date);
  }

  async getAvailability(courtId: number, date: string | undefined): Promise<CourtAvailabilityResponse> {
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
      venueRating: buildVenueRating({
        ratingAverage: court.venueRatingAverage,
        reviewCount: court.venueReviewCount,
      }),
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
