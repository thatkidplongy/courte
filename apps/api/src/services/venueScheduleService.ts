import { DateTime } from 'luxon';

import type { VenueScheduleCourt, VenueScheduleResponse } from '@courte/contract';

import { HOURS_PER_DAY, MINUTES_PER_HOUR, MS_PER_MINUTE, RECENT_REVIEWS_ON_VENUE_PAGE } from '@/consts';
import { findAmenitiesForVenue } from '@/db/repositories/amenityRepository';
import { findCourtById, findCourtsByVenue } from '@/db/repositories/courtRepository';
import { findOpeningWindowsForCourts } from '@/db/repositories/openingWindowRepository';
import { findPriceRulesForCourts } from '@/db/repositories/priceRuleRepository';
import { findRecentReviewsForVenue, findVenueRating } from '@/db/repositories/reviewRepository';
import { findVenuePhotos, findVenueSummary } from '@/db/repositories/venueRepository';
import { getAvailability } from '@/domain/availability/getAvailability';
import type { Interval } from '@/domain/availability/types';
import { NotFoundError } from '@/domain/errors';
import { resolveQuote, type PriceRule } from '@/domain/pricing/resolveQuote';
import { buildVenueRating } from '@/domain/reviews/buildVenueRating';
import { buildDaySchedule, listOpenHourStarts } from '@/domain/schedule/buildDaySchedule';
import { getAvailabilityForCourts } from '@/services/availabilityService';

const HOUR_MS = MINUTES_PER_HOUR * MS_PER_MINUTE;

/**
 * Prices one hour on one court by asking the same resolver a real booking would. Going through
 * `resolveQuote` rather than reading the cheapest rule means the grid shows peak pricing where
 * peak pricing applies — the number in the cell is the number you will be charged.
 *
 * A court with no rule covering that hour throws rather than returning zero, so a missing rule
 * shows as "no price" instead of as free.
 */
const priceHour = (rules: PriceRule[], start: number, timezone: string): number | null => {
  if (rules.length === 0) return null;

  try {
    const quote = resolveQuote({
      rules,
      requested: { start, end: start + HOUR_MS },
      timezone,
      isMember: false,
    });
    return quote.totalCents;
  } catch {
    return null;
  }
};

const toOpeningLabel = (openIntervals: Interval[], timezone: string): string | null => {
  if (openIntervals.length === 0) return null;

  const opensAt = Math.min(...openIntervals.map(interval => interval.start));
  const closesAt = Math.max(...openIntervals.map(interval => interval.end));
  const format = (ms: number) => DateTime.fromMillis(ms, { zone: timezone }).toFormat('h a');

  return `${format(opensAt)} – ${format(closesAt)}`;
};

/**
 * Every court at a venue for one day, as the grid the venue page draws.
 *
 * The reader arrives holding a court id from a search result, but what they are actually
 * choosing between is that venue's courts at that hour — so this resolves the venue from the
 * court and returns the whole thing.
 */
export const getVenueSchedule = async (courtId: number, date: string | undefined): Promise<VenueScheduleResponse> => {
  const anchorCourt = await findCourtById(courtId);
  if (!anchorCourt) throw new NotFoundError('Court');

  const venue = await findVenueSummary(anchorCourt.venueId);
  if (!venue) throw new NotFoundError('Venue');

  const timezone = venue.timezone;
  const day = date
    ? DateTime.fromISO(date, { zone: timezone }).startOf('day')
    : DateTime.now().setZone(timezone).startOf('day');
  const resolvedDay = day.isValid ? day : DateTime.now().setZone(timezone).startOf('day');
  const range = { start: resolvedDay.toMillis(), end: resolvedDay.plus({ days: 1 }).toMillis() };

  const courts = await findCourtsByVenue(anchorCourt.venueId);
  const courtIds = courts.map(court => court.id);

  const [windows, freeAvailability, rules, photos, amenities, rating, reviews] = await Promise.all([
    findOpeningWindowsForCourts(courtIds),
    getAvailabilityForCourts(courts, range),
    findPriceRulesForCourts(courtIds),
    findVenuePhotos(venue.id),
    findAmenitiesForVenue(venue.id),
    findVenueRating(venue.id),
    findRecentReviewsForVenue(venue.id, RECENT_REVIEWS_ON_VENUE_PAGE),
  ]);

  // Opening hours are availability with nothing booked. Deriving them through the same function
  // keeps one implementation of "when is this court open", rather than a second one here that
  // could drift from it.
  const openAvailability = getAvailability({ courtIds, range, timezone, windows, blocked: [] });
  const openByCourt = new Map(openAvailability.map(entry => [entry.courtId, entry.free]));
  const freeByCourt = new Map([...freeAvailability].map(([id, entry]) => [id, entry.free]));

  const hourAnchors = Array.from({ length: HOURS_PER_DAY }, (_, hour) => resolvedDay.plus({ hours: hour }).toMillis());
  const hourStarts = listOpenHourStarts(
    openAvailability.flatMap(entry => entry.free),
    hourAnchors
  );

  const grid = buildDaySchedule({ courts, openByCourt, freeByCourt, hourStarts, notBefore: Date.now() });
  const gridByCourt = new Map(grid.map(row => [row.courtId, row.cells]));
  const rulesByCourt = new Map<number, PriceRule[]>();
  rules.forEach(rule => rulesByCourt.set(rule.courtId, [...(rulesByCourt.get(rule.courtId) ?? []), rule]));

  const scheduleCourts: VenueScheduleCourt[] = courts.map(court => ({
    id: court.id,
    name: court.name,
    sport: court.sport,
    surface: court.surface,
    minDurationMinutes: court.minDurationMinutes,
    maxDurationMinutes: court.maxDurationMinutes,
    incrementMinutes: court.incrementMinutes,
    cells: (gridByCourt.get(court.id) ?? []).map(cell => ({
      startIso: new Date(cell.start).toISOString(),
      state: cell.state,
      ratePerHourCents: priceHour(rulesByCourt.get(court.id) ?? [], cell.start, timezone),
    })),
  }));

  return {
    venueId: venue.id,
    venueName: venue.name,
    venueAddress: venue.address,
    venueTimezone: timezone,
    venueDescription: venue.description,
    venuePhone: venue.phone,
    venueWebsite: venue.website,
    venuePhotos: photos,
    venueAmenities: amenities,
    venueRating: buildVenueRating(rating),
    venueReviews: reviews,
    courtId: anchorCourt.id,
    dayStartIso: resolvedDay.toUTC().toISO() ?? new Date(range.start).toISOString(),
    openingLabel: toOpeningLabel(
      openAvailability.flatMap(entry => entry.free),
      timezone
    ),
    hourIsos: hourStarts.map(start => new Date(start).toISOString()),
    courts: scheduleCourts,
  };
};
