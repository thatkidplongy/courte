import {
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
  type CourtSort,
  type CourtSurface,
  type Sport,
  type VenuePhoto,
} from '@courte/contract';

import { query } from '@/db/client';

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
  id: number;
  venue_id: number;
  name: string;
  sport: Sport;
  surface: CourtSurface;
  min_duration_minutes: number;
  max_duration_minutes: number;
  increment_minutes: number;
  buffer_minutes: number;
};

export type Court = {
  id: number;
  venueId: number;
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

const COURT_FIELDS = [
  'id',
  'venue_id',
  'name',
  'sport',
  'surface',
  'min_duration_minutes',
  'max_duration_minutes',
  'increment_minutes',
  'buffer_minutes',
] as const;

/** Bare, for RETURNING clauses, which have no table to qualify against. */
const COURT_COLUMNS_BARE = COURT_FIELDS.join(', ');

/** Qualified, because every read of them joins `venues` to check the venue is live too. */
const COURT_COLUMNS = COURT_FIELDS.map(field => `c.${field}`).join(', ');

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
export const findCourtById = async (courtId: number): Promise<Court | null> => {
  const rows = await query<CourtRow>(
    `
    SELECT ${COURT_COLUMNS}
    FROM "Court" c
    JOIN "Venue" v ON v.id = c.venue_id
    WHERE c.id = $1 AND c.deleted_at IS NULL AND v.deleted_at IS NULL
    `,
    [courtId]
  );
  const row = rows[0];
  return row ? toCourt(row) : null;
};

export const findCourtsByVenue = async (venueId: number): Promise<Court[]> => {
  const rows = await query<CourtRow>(
    `
    SELECT ${COURT_COLUMNS}
    FROM "Court" c
    JOIN "Venue" v ON v.id = c.venue_id
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
  review_count: number | null;
  rating_avg: string | null;
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
  venueReviewCount: number;
  venueRatingAverage: number | null;
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
  // NULLS LAST is the whole point: an unrated venue is not a badly rated one, so it sorts after
  // every venue that has been rated rather than below the worst of them.
  rating: 'rating_avg DESC NULLS LAST, review_count DESC, distance_metres ASC, venue_name ASC, name ASC',
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
          SELECT count(*) FROM "VenueAmenity" va
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
        rating.review_count,
        rating.rating_avg,
        ST_Distance(v.location, origin.point) AS distance_metres,
        rate.from_rate_cents
      FROM "Court" c
      JOIN "Venue" v ON v.id = c.venue_id
      CROSS JOIN origin
      LEFT JOIN LATERAL (
        SELECT MIN(pr.rate_per_hour_cents) AS from_rate_cents
        FROM "PriceRule" pr
        WHERE pr.court_id = c.id AND NOT pr.member_only
      ) rate ON true
      -- A plain JOIN would be correct too: the view LEFT JOINs from "Venue", so there is a row
      -- for every venue. LEFT is defensive against that changing under us.
      LEFT JOIN "VenueRating" rating ON rating.venue_id = v.id
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS venue_court_count
        FROM "Court" sc
        WHERE sc.venue_id = v.id AND sc.deleted_at IS NULL
      ) sibling ON true
      LEFT JOIN LATERAL (
        SELECT COALESCE(array_agg(va.amenity_slug ORDER BY a.sort_order, a.slug), '{}') AS venue_amenity_slugs
        FROM "VenueAmenity" va
        JOIN "Amenity" a ON a.slug = va.amenity_slug AND a.deleted_at IS NULL
        WHERE va.venue_id = v.id AND va.deleted_at IS NULL
      ) amen ON true
      -- A photo of this court wins over a photo of the venue: the boolean sorts false (0)
      -- for the court's own rows, so they come first without a second query.
      LEFT JOIN LATERAL (
        SELECT vp.url, vp.alt
        FROM "VenuePhoto" vp
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
    venueReviewCount: row.review_count ?? 0,
    venueRatingAverage: row.rating_avg == null ? null : Number(row.rating_avg),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    distanceMetres: Math.round(row.distance_metres),
    fromRatePerHourCents: row.from_rate_cents === null ? null : Number(row.from_rate_cents),
  }));

  return { courts, total: rows.length > 0 ? Number(rows[0]?.total_count ?? 0) : 0 };
};

/**
 * The owner's view: archived courts included, flagged rather than hidden. Retiring a court is
 * reversible, and a screen that simply stops showing it gives the owner no way to undo.
 */
export const findCourtsForOwner = async (venueId: number): Promise<Array<Court & { isArchived: boolean }>> => {
  const rows = await query<CourtRow & { deleted_at: string | null }>(
    `
    SELECT ${COURT_COLUMNS}, c.deleted_at
    FROM "Court" c
    WHERE c.venue_id = $1
    ORDER BY c.deleted_at NULLS FIRST, c.name ASC
    `,
    [venueId]
  );

  return rows.map(row => ({ ...toCourt(row), isArchived: row.deleted_at !== null }));
};

/**
 * One court for its owner, archived or not. Deliberately not `findCourtById`: that one is a
 * discovery lookup and hides archived rows, which would make restoring one impossible — the
 * restore would 404 on the very state it exists to undo.
 */
export const findCourtForOwner = async (courtId: number): Promise<(Court & { isArchived: boolean }) | null> => {
  const rows = await query<CourtRow & { deleted_at: string | null }>(
    `SELECT ${COURT_COLUMNS}, c.deleted_at FROM "Court" c WHERE c.id = $1`,
    [courtId]
  );

  const row = rows[0];
  return row ? { ...toCourt(row), isArchived: row.deleted_at !== null } : null;
};

export type CourtWrite = {
  name: string;
  sport: Sport;
  surface: CourtSurface;
  minDurationMinutes: number;
  maxDurationMinutes: number;
  incrementMinutes: number;
  bufferMinutes: number;
};

export const insertCourt = async (venueId: number, court: CourtWrite): Promise<Court> => {
  const rows = await query<CourtRow>(
    `
    INSERT INTO "Court" (venue_id, name, sport, surface, min_duration_minutes, max_duration_minutes,
                        increment_minutes, buffer_minutes)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING ${COURT_COLUMNS_BARE}
    `,
    [
      venueId,
      court.name,
      court.sport,
      court.surface,
      court.minDurationMinutes,
      court.maxDurationMinutes,
      court.incrementMinutes,
      court.bufferMinutes,
    ]
  );

  return toCourt(rows[0]!);
};

export const updateCourt = async (courtId: number, court: CourtWrite): Promise<Court | null> => {
  const rows = await query<CourtRow>(
    `
    UPDATE "Court"
    SET name = $2, sport = $3, surface = $4, min_duration_minutes = $5, max_duration_minutes = $6,
        increment_minutes = $7, buffer_minutes = $8
    WHERE id = $1
    RETURNING ${COURT_COLUMNS_BARE}
    `,
    [
      courtId,
      court.name,
      court.sport,
      court.surface,
      court.minDurationMinutes,
      court.maxDurationMinutes,
      court.incrementMinutes,
      court.bufferMinutes,
    ]
  );

  const row = rows[0];
  return row ? toCourt(row) : null;
};

/** Archive and restore are the same operation with a different value. There is no delete. */
export const setCourtArchived = async (courtId: number, isArchived: boolean): Promise<boolean> => {
  const rows = await query<{ id: number }>('UPDATE "Court" SET deleted_at = $2 WHERE id = $1 RETURNING id', [
    courtId,
    isArchived ? new Date().toISOString() : null,
  ]);
  return rows.length > 0;
};
