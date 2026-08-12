import { z } from 'zod';

import { idSchema, isoDateTimeSchema } from './common';
import { MAX_BOOKING_MINUTES, MAX_SERIES_WEEKS, MIN_BOOKING_MINUTES, MIN_SERIES_WEEKS } from './consts';

export const createSeriesBodySchema = z.object({
  courtId: idSchema,
  startIso: isoDateTimeSchema,
  durationMinutes: z.coerce.number().int().min(MIN_BOOKING_MINUTES).max(MAX_BOOKING_MINUTES),
  weeks: z.coerce.number().int().min(MIN_SERIES_WEEKS).max(MAX_SERIES_WEEKS),
});

export type CreateSeriesBody = z.infer<typeof createSeriesBodySchema>;

/**
 * A partially-booked series is a success, not a failure: clear weeks are booked and the
 * clashing ones come back as timestamps. The web formats them in `timezone` — the API does
 * not return pre-formatted strings, because a second client would format them differently.
 */
export type CreateSeriesResponse = {
  seriesId: string;
  created: number;
  requested: number;
  conflictIsos: string[];
  timezone: string;
};
