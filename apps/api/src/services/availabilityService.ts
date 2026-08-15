import { findOpeningWindowsForCourts } from '@/db/repositories/courtRepository';
import { findBlockedIntervals } from '@/db/repositories/reservationRepository';
import { findVenueTimezones } from '@/db/repositories/venueRepository';
import { getAvailability } from '@/domain/availability/getAvailability';
import type { CourtAvailability, Interval } from '@/domain/availability/types';

/**
 * The data-fetching half of the availability seam (docs/adr/0001): two bulk queries feed the
 * pure derivation, so query count stays flat no matter how many courts a page shows.
 *
 * Each court's blocked intervals are widened by ITS OWN buffer before subtraction: a new
 * booking's guarded range extends `buffer` beyond its play time on both sides, so a start is
 * only genuinely offerable when that widened range clears every existing reservation.
 * Without this, chips adjacent to an existing booking pass the visual check and then lose at
 * the exclusion constraint every time.
 */
export const getAvailabilityForCourts = async (
  courts: Array<{ id: number; venueId: number; bufferMinutes: number }>,
  range: Interval
): Promise<Map<number, CourtAvailability>> => {
  const courtIds = courts.map(court => court.id);
  const [windows, rawBlocked, timezones] = await Promise.all([
    findOpeningWindowsForCourts(courtIds),
    findBlockedIntervals(courtIds, new Date(range.start), new Date(range.end)),
    findVenueTimezones([...new Set(courts.map(court => court.venueId))]),
  ]);

  const bufferByCourt = new Map(courts.map(court => [court.id, court.bufferMinutes * 60_000]));
  const blocked = rawBlocked.map(interval => {
    const bufferMs = bufferByCourt.get(interval.courtId) ?? 0;
    return { ...interval, start: interval.start - bufferMs, end: interval.end + bufferMs };
  });

  const result = new Map<number, CourtAvailability>();

  // Availability derives per venue timezone; group courts so each venue expands in its zone.
  const courtsByVenue = new Map<number, number[]>();
  for (const court of courts) {
    const list = courtsByVenue.get(court.venueId) ?? [];
    list.push(court.id);
    courtsByVenue.set(court.venueId, list);
  }

  for (const [venueId, venueCourtIds] of courtsByVenue) {
    const timezone = timezones.get(venueId);
    if (!timezone) continue;

    const availability = getAvailability({ courtIds: venueCourtIds, range, timezone, windows, blocked });
    for (const entry of availability) result.set(entry.courtId, entry);
  }

  return result;
};
