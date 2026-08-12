import { DEFAULT_LIMIT, DEFAULT_PAGE, type Sport } from '@courte/contract';

import { query } from '@/db/client';
import type { OpeningWindow } from '@/domain/availability/types';

/**
 * Repositories build and run queries and do nothing else. No branching on a flag parameter to
 * return "one row or all rows" — that is two questions, so it is two methods.
 *
 * Every value reaches Postgres as a bound parameter. There is no string interpolation in this
 * file and there must never be one.
 */

type CourtRow = {
  id: string;
  venue_id: string;
  name: string;
  sport: Sport;
  is_indoor: boolean;
  min_duration_minutes: number;
  max_duration_minutes: number;
  increment_minutes: number;
  buffer_minutes: number;
};

export type Court = {
  id: string;
  venueId: string;
  name: string;
  sport: Sport;
  isIndoor: boolean;
  minDurationMinutes: number;
  maxDurationMinutes: number;
  incrementMinutes: number;
  bufferMinutes: number;
};

const toCourt = (row: CourtRow): Court => ({
  id: row.id,
  venueId: row.venue_id,
  name: row.name,
  sport: row.sport,
  isIndoor: row.is_indoor,
  minDurationMinutes: row.min_duration_minutes,
  maxDurationMinutes: row.max_duration_minutes,
  incrementMinutes: row.increment_minutes,
  bufferMinutes: row.buffer_minutes,
});

const COURT_COLUMNS = `
  id, venue_id, name, sport, is_indoor,
  min_duration_minutes, max_duration_minutes, increment_minutes, buffer_minutes
`;

export const findCourtById = async (courtId: string): Promise<Court | null> => {
  const rows = await query<CourtRow>(`SELECT ${COURT_COLUMNS} FROM courts WHERE id = $1`, [courtId]);
  const row = rows[0];
  return row ? toCourt(row) : null;
};

export const findCourtsByVenue = async (venueId: string): Promise<Court[]> => {
  const rows = await query<CourtRow>(`SELECT ${COURT_COLUMNS} FROM courts WHERE venue_id = $1 ORDER BY name ASC`, [
    venueId,
  ]);
  return rows.map(toCourt);
};

type VenueSearchRow = CourtRow & {
  venue_name: string;
  venue_timezone: string;
  distance_metres: number;
  total_count: string;
};

export type CourtSearchResult = Court & {
  venueName: string;
  venueTimezone: string;
  distanceMetres: number;
};

export type SearchCourtsParams = {
  sport: Sport;
  longitude: number;
  latitude: number;
  radiusMetres: number;
  page?: number;
  limit?: number;
};

/**
 * Returns every candidate court for a search in one round trip, with its venue and distance
 * already joined. Availability is layered on afterwards from a single bulk reservation fetch,
 * so query count stays flat regardless of how many courts match.
 */
export const searchCourtsByProximity = async (
  params: SearchCourtsParams
): Promise<{ courts: CourtSearchResult[]; total: number }> => {
  const page = params.page ?? DEFAULT_PAGE;
  const limit = params.limit ?? DEFAULT_LIMIT;
  const offset = (page - 1) * limit;

  const rows = await query<VenueSearchRow>(
    `
    WITH origin AS (
      SELECT ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography AS point
    ),
    matches AS (
      SELECT
        c.id, c.venue_id, c.name, c.sport, c.is_indoor,
        c.min_duration_minutes, c.max_duration_minutes, c.increment_minutes, c.buffer_minutes,
        v.name     AS venue_name,
        v.timezone AS venue_timezone,
        ST_Distance(v.location, origin.point) AS distance_metres
      FROM courts c
      JOIN venues v ON v.id = c.venue_id
      CROSS JOIN origin
      WHERE c.sport = $1
        AND ST_DWithin(v.location, origin.point, $4)
    )
    SELECT *, COUNT(*) OVER () AS total_count
    FROM matches
    ORDER BY distance_metres ASC, venue_name ASC, name ASC
    LIMIT $5 OFFSET $6
    `,
    [params.sport, params.longitude, params.latitude, params.radiusMetres, limit, offset]
  );

  const courts = rows.map(row => ({
    ...toCourt(row),
    venueName: row.venue_name,
    venueTimezone: row.venue_timezone,
    distanceMetres: Math.round(row.distance_metres),
  }));

  return { courts, total: rows.length > 0 ? Number(rows[0]?.total_count ?? 0) : 0 };
};

type OpeningWindowRow = {
  court_id: string;
  day_of_week: number;
  starts_at: string;
  duration_minutes: number;
};

/**
 * Bulk-loaded for every court in a search at once. Fetching these per court is the N+1 that
 * makes the results page slow, and it is the reason this takes an array.
 */
export const findOpeningWindowsForCourts = async (courtIds: string[]): Promise<OpeningWindow[]> => {
  if (courtIds.length === 0) return [];

  const rows = await query<OpeningWindowRow>(
    `
    SELECT court_id, day_of_week, starts_at::text AS starts_at, duration_minutes
    FROM opening_windows
    WHERE court_id = ANY($1::uuid[])
    ORDER BY court_id, day_of_week, starts_at
    `,
    [courtIds]
  );

  return rows.map(row => ({
    courtId: row.court_id,
    dayOfWeek: row.day_of_week,
    startsAt: row.starts_at,
    durationMinutes: row.duration_minutes,
  }));
};
