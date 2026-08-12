import { z } from 'zod';

import { isoDateSchema } from './common';
import { DEFAULT_SEARCH_RADIUS_METRES, MAX_SEARCH_RADIUS_METRES, SEARCH_DEFAULTS, SPORTS, type Sport } from './consts';

export const searchCourtsQuerySchema = z.object({
  sport: z.enum(SPORTS).default('pickleball'),
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
  id: string;
  name: string;
  sport: Sport;
  isIndoor: boolean;
  venueId: string;
  venueName: string;
  venueTimezone: string;
  distanceMetres: number;
  fromRatePerHourCents: number | null;
  slotStartIsos: string[];
};

export type CourtAvailabilityResponse = CourtRules & {
  id: string;
  name: string;
  sport: Sport;
  isIndoor: boolean;
  venueId: string;
  venueTimezone: string;
  /** Start of the requested day in the venue's zone, so the web can build its hour pickers. */
  dayStartIso: string;
  dayEndIso: string;
  slotStartIsos: string[];
};
