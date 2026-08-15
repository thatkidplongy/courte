import {
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
  type CourtSort,
  type CourtSurface,
  type Sport,
  type VenuePhoto,
} from '@courte/contract';

import { query } from '@/db/client';
import type { OpeningWindow } from '@/domain/availability/types';

/**
 * Repositories build and run queries and do nothing else. No branching on a flag parameter to
 * return "one row or all rows" — that is two questions, so it is two methods.
 *
 * Every value reaches Postgres as a bound parameter — no caller-supplied string is ever spliced
 * into SQL text. `searchCourtsByProximity` assembles its WHERE and ORDER BY from fragments, but
 * each fragment is either a `$n` placeholder this file generated or a constant chosen by a
 * closed enum key. If you add a fragment, it must come from one of those two sources.
 */

type CourtRow = {
  id: string;
  venue_id: string;
  name: string;
  sport: Sport;
  surface: CourtSurface;
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
  surface: CourtSurface;
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
  surface: row.surface,
  minDurationMinutes: row.min_duration_minutes,
  maxDurationMinutes: row.max_duration_minutes,
  incrementMinutes: row.increment_minutes,
  bufferMinutes: row.buffer_minutes,
});

/** Qualified with `c.`, because every read of them joins `venues` to check the venue is live. */
const COURT_COLUMNS = `
  c.id, c.venue_id, c.name, c.sport, c.surface,
  c.min_duration_minutes, c.max_duration_minutes, c.increment_minutes, c.buffer_minutes
`;

/**
 * Archived courts are invisible here and in every other read on this page. Both callers are
 * asking a discovery question — "can this be booked, can this be shown" — and the answer for a
 * retired court is no. Reads that render an EXISTING booking join `courts` directly and are
 * deliberately not filtered, so a game played on a since-retired court can still name it.
 *
 * Both check the VENUE too. Archiving a venue has to close every court under it, and without
 * that join a court at a retired venue merely vanishes from search while staying bookable to
 * anyone holding its URL — this is the lookup `placeHold` and the walk-in desk go through.
 */
export const findCourtById = async (courtId: string): Promise<Court | null> => {
  const rows = await query<CourtRow>(
    `
    SELECT ${COURT_COLUMNS}
    FROM courts c
    JOIN venues v ON v.id = c.venue_id
    WHERE c.id = $1 AND c.deleted_at IS NULL AND v.deleted_at IS NULL
    `,
    [courtId]
  );
  const row = rows[0];
  return row ? toCourt(row) : null;
};

export const findCourtsByVenue = async (venueId: string): Promise<Court[]> => {
  const rows = await query<CourtRow>(
    `
    SELECT ${COURT_COLUMNS}
    FROM courts c
    JOIN venues v ON v.id = c.venue_id
    WHERE c.venue_id = $1 AND c.deleted_at IS NULL AND v.deleted_at IS NULL
    ORDER BY c.name ASC
    `,
    [venueId]
  );
  return rows.map(toCourt);
};

type VenueSearchRow = CourtRow & {
  venue_name: string;
  venue_address: string;
  venue_timezone: string;
  venue_court_count: string;
  venue_amenity_slugs: string[] | null;
  photo_url: string | null;
  photo_alt: string | null;
  latitude: number;
  longitude: number;
  distance_metres: number;
  from_rate_cents: number | null;
  total_count: string;
};

export type CourtSearchResult = Court & {
  venueName: string;
  venueAddress: string;
  venueTimezone: string;
  venueCourtCount: number;
  venueAmenitySlugs: string[];
  venuePhoto: VenuePhoto | null;
  latitude: number;
  longitude: number;
  distanceMetres: number;
  /** Cheapest rule a non-member can book. Null when the court has no public price at all. */
  fromRatePerHourCents: number | null;
};

export type SearchCourtsParams = {
  sport?: Sport;
  surface?: CourtSurface;
  /** Every slug must be present on the venue. An empty array is no filter. */
  amenitySlugs?: string[];
  minRatePerHourCents?: number;
  maxRatePerHourCents?: number;
  sort: CourtSort;
  longitude: number;
  latitude: number;
  radiusMetres: number;
  page?: number;
  limit?: number;
};

/**
 * Fixed fragments chosen by key, never built from caller input. The sort value is already a
 * closed enum by the time it arrives, and this keeps it that way in the one place where a
 * string does reach the SQL text.
 */
const ORDER_BY_SORT: Record<CourtSort, string> = {
  distance: 'distance_metres ASC, venue_name ASC, name ASC',
  price: 'from_rate_cents ASC NULLS LAST, distance_metres ASC, venue_name ASC, name ASC',
};

/**
 * Returns every candidate court for a search in one round trip, with its venue, distance and
 * cheapest public rate already joined. Availability is layered on afterwards from a single bulk
 * reservation fetch, so query count stays flat regardless of how many courts match.
 *
 * The rate is computed here rather than in the service because the marketplace filters and
 * sorts on it. A price filter applied after the page was fetched would contradict `total`.
 */
export const searchCourtsByProximity = async (
  params: SearchCourtsParams
): Promise<{ courts: CourtSearchResult[]; total: number }> => {
  const page = params.page ?? DEFAULT_PAGE;
  const limit = params.limit ?? DEFAULT_LIMIT;
  const offset = (page - 1) * limit;

  const values: unknown[] = [params.longitude, params.latitude, params.radiusMetres];
  const filters: string[] = [];

  if (params.sport) {
    values.push(params.sport);
    filters.push(`AND c.sport = $${values.length}`);
  }
  if (params.surface) {
    values.push(params.surface);
    filters.push(`AND c.surface = $${values.length}`);
  }
  if (params.amenitySlugs && params.amenitySlugs.length > 0) {
    // Counting matches and comparing to the number asked for is AND semantics: ticking parking
    // and showers must narrow to venues with both, where a plain `= ANY` would widen to either.
    values.push(params.amenitySlugs);
    filters.push(`AND (
          SELECT count(*) FROM venue_amenities va
          WHERE va.venue_id = v.id AND va.deleted_at IS NULL AND va.amenity_slug = ANY($${values.length}::text[])
        ) = cardinality($${values.length}::text[])`);
  }
  if (params.maxRatePerHourCents !== undefined) {
    // A court with no public rule has a NULL rate, and NULL <= n is NULL, so priced-only is
    // the correct reading of "under ₱X" — an unpriced court cannot be booked at any price.
    values.push(params.maxRatePerHourCents);
    filters.push(`AND rate.from_rate_cents <= $${values.length}`);
  }
  if (params.minRatePerHourCents !== undefined) {
    values.push(params.minRatePerHourCents);
    filters.push(`AND rate.from_rate_cents >= $${values.length}`);
  }

  values.push(limit);
  const limitPlaceholder = `$${values.length}`;
  values.push(offset);
  const offsetPlaceholder = `$${values.length}`;

  const rows = await query<VenueSearchRow>(
    `
    WITH origin AS (
      SELECT ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography AS point
    ),
    matches AS (
      SELECT
        c.id, c.venue_id, c.name, c.sport, c.surface,
        c.min_duration_minutes, c.max_duration_minutes, c.increment_minutes, c.buffer_minutes,
        v.name     AS venue_name,
        v.address  AS venue_address,
        v.timezone AS venue_timezone,
        amen.venue_amenity_slugs,
        photo.url AS photo_url,
        photo.alt AS photo_alt,
        -- The geography column has no ST_X/ST_Y; casting to geometry is the documented way to
        -- read a point's ordinates back out, and is exact rather than a projection.
        ST_Y(v.location::geometry) AS latitude,
        ST_X(v.location::geometry) AS longitude,
        sibling.venue_court_count,
        ST_Distance(v.location, origin.point) AS distance_metres,
        rate.from_rate_cents
      FROM courts c
      JOIN venues v ON v.id = c.venue_id
      CROSS JOIN origin
      LEFT JOIN LATERAL (
        SELECT MIN(pr.rate_per_hour_cents) AS from_rate_cents
        FROM price_rules pr
        WHERE pr.court_id = c.id AND NOT pr.member_only
      ) rate ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS venue_court_count
        FROM courts sc
        WHERE sc.venue_id = v.id AND sc.deleted_at IS NULL
      ) sibling ON true
      LEFT JOIN LATERAL (
        SELECT COALESCE(array_agg(va.amenity_slug ORDER BY a.sort_order, a.slug), '{}') AS venue_amenity_slugs
        FROM venue_amenities va
        JOIN amenities a ON a.slug = va.amenity_slug AND a.deleted_at IS NULL
        WHERE va.venue_id = v.id AND va.deleted_at IS NULL
      ) amen ON true
      -- A photo of this court wins over a photo of the venue: the boolean sorts false (0)
      -- for the court's own rows, so they come first without a second query.
      LEFT JOIN LATERAL (
        SELECT vp.url, vp.alt
        FROM venue_photos vp
        WHERE vp.venue_id = v.id
          AND (vp.court_id = c.id OR vp.court_id IS NULL)
          AND vp.deleted_at IS NULL
        ORDER BY (vp.court_id IS DISTINCT FROM c.id), vp.sort_order, vp.id
        LIMIT 1
      ) photo ON true
      WHERE ST_DWithin(v.location, origin.point, $3)
        AND c.deleted_at IS NULL
        AND v.deleted_at IS NULL
        ${filters.join('\n        ')}
    )
    SELECT *, COUNT(*) OVER () AS total_count
    FROM matches
    ORDER BY ${ORDER_BY_SORT[params.sort]}
    LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}
    `,
    values
  );

  const courts = rows.map(row => ({
    ...toCourt(row),
    venueName: row.venue_name,
    venueAddress: row.venue_address,
    venueTimezone: row.venue_timezone,
    venueCourtCount: Number(row.venue_court_count),
    venueAmenitySlugs: row.venue_amenity_slugs ?? [],
    venuePhoto: row.photo_url && row.photo_alt ? { url: row.photo_url, alt: row.photo_alt } : null,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    distanceMetres: Math.round(row.distance_metres),
    fromRatePerHourCents: row.from_rate_cents === null ? null : Number(row.from_rate_cents),
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
