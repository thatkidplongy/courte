import { z } from 'zod';

import { isoDateSchema } from './common';
import {
  AMENITY_SLUG_PATTERN,
  COURT_SORTS,
  COURT_SURFACES,
  DEFAULT_SEARCH_RADIUS_METRES,
  MAX_AMENITY_FILTERS,
  MAX_SEARCH_RADIUS_METRES,
  SEARCH_DEFAULTS,
  SPORTS,
  type CourtSurface,
  type Sport,
} from './consts';
import type { Amenity, VenuePhoto } from './venues';

/**
 * `?amenities=parking,showers` rather than a repeated key: the filter rail writes the URL by
 * hand and one comma-joined value keeps that readable. An empty or absent parameter is no
 * filter at all — the array only ever narrows.
 */
const amenitySlugsSchema = z.preprocess(
  value =>
    typeof value === 'string'
      ? // Deduplicated here rather than in SQL. The filter is resolved by counting matching
        // rows and comparing to the number of slugs asked for, so `parking,parking` would
        // want two rows from a table whose primary key permits one — and quietly match
        // nothing at all instead of behaving like `parking`.
        [
          ...new Set(
            value
              .split(',')
              .map(slug => slug.trim())
              .filter(Boolean)
          ),
        ]
      : value,
  z.array(z.string().regex(AMENITY_SLUG_PATTERN)).max(MAX_AMENITY_FILTERS)
);

/**
 * Every filter here is resolved in SQL. That is deliberate: a filter applied after the page is
 * fetched would make `total` describe one set of courts and `data` another, and the pager
 * would count pages that do not exist.
 */
export const searchCourtsQuerySchema = z.object({
  /** Absent means every sport — the marketplace default. A card still names its own sport. */
  sport: z.enum(SPORTS).optional(),
  surface: z.enum(COURT_SURFACES).optional(),
  /** Every listed amenity must be present, not any of them — ticking two narrows, never widens. */
  amenities: amenitySlugsSchema.default([]),
  minRatePerHourCents: z.coerce.number().int().nonnegative().optional(),
  maxRatePerHourCents: z.coerce.number().int().positive().optional(),
  sort: z.enum(COURT_SORTS).default('distance'),
  date: isoDateSchema.optional(),
  latitude: z.coerce.number().min(-90).max(90).default(SEARCH_DEFAULTS.latitude),
  longitude: z.coerce.number().min(-180).max(180).default(SEARCH_DEFAULTS.longitude),
  radiusMetres: z.coerce.number().int().positive().max(MAX_SEARCH_RADIUS_METRES).default(DEFAULT_SEARCH_RADIUS_METRES),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type SearchCourtsQuery = z.infer<typeof searchCourtsQuerySchema>;

export const courtAvailabilityQuerySchema = z.object({
  date: isoDateSchema.optional(),
});

export type CourtAvailabilityQuery = z.infer<typeof courtAvailabilityQuerySchema>;

export type CourtRules = {
  minDurationMinutes: number;
  maxDurationMinutes: number;
  incrementMinutes: number;
};

/**
 * A search hit. `slotStartIsos` and `fromRatePerHourCents` are computed server-side — the
 * chips a card shows are an availability question, and availability is backend work.
 */
export type CourtSearchItem = CourtRules & {
  id: number;
  name: string;
  sport: Sport;
  surface: CourtSurface;
  venueId: number;
  venueName: string;
  venueAddress: string;
  venueTimezone: string;
  /** How many courts the venue has in total, so a row can say "4 courts" truthfully. */
  venueCourtCount: number;
  /**
   * Slugs only. The row resolves them against the catalogue from `GET /v1/amenities` rather
   * than carrying a label on every court of every venue on the page.
   */
  venueAmenitySlugs: string[];
  /** The venue's first photo, or null — most venues have none, and the row says so by omission. */
  venuePhoto: VenuePhoto | null;
  /** The venue's own point, for the results map. Every court at a venue shares it. */
  latitude: number;
  longitude: number;
  distanceMetres: number;
  fromRatePerHourCents: number | null;
  slotStartIsos: string[];
};

export const venueScheduleQuerySchema = z.object({
  date: isoDateSchema.optional(),
});

export type VenueScheduleQuery = z.infer<typeof venueScheduleQuerySchema>;

/**
 * Three ways an hour can be unbookable, kept apart because the grid names the reason. `closed`
 * is the venue's hours, `past` is the clock, `booked` is somebody else — and only the last is a
 * reason to come back and check again later.
 */
export type ScheduleCellState = 'open' | 'booked' | 'closed' | 'past';

export type VenueScheduleCell = {
  startIso: string;
  state: ScheduleCellState;
  /** The rate that hour would actually be charged at, or null with no public rule. */
  ratePerHourCents: number | null;
};

export type VenueScheduleCourt = CourtRules & {
  id: number;
  name: string;
  sport: Sport;
  surface: CourtSurface;
  cells: VenueScheduleCell[];
};

/**
 * Every court at a venue for one day, as a grid. The reader arrives holding a single court id
 * but is really choosing between that venue's courts, so the page needs all of them.
 */
export type VenueScheduleResponse = {
  venueId: number;
  venueName: string;
  venueAddress: string;
  venueTimezone: string;
  /** The venue's own copy. Null for most venues, which is why every consumer must handle null. */
  venueDescription: string | null;
  venuePhone: string | null;
  venueWebsite: string | null;
  venuePhotos: VenuePhoto[];
  venueAmenities: Amenity[];
  /** The court that was asked for — its row opens selected. */
  courtId: number;
  dayStartIso: string;
  /** Venue-local opening span for the day, already formatted. Null when nothing opens. */
  openingLabel: string | null;
  /** One ISO per hour column, ascending. Empty when the venue is shut that day. */
  hourIsos: string[];
  courts: VenueScheduleCourt[];
};

export type CourtAvailabilityResponse = CourtRules & {
  id: number;
  name: string;
  sport: Sport;
  surface: CourtSurface;
  venueId: number;
  venueTimezone: string;
  /** Start of the requested day in the venue's zone, so the web can build its hour pickers. */
  dayStartIso: string;
  dayEndIso: string;
  slotStartIsos: string[];
};
