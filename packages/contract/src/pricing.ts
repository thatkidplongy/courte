import { z } from 'zod';

import { isoDateSchema } from './common';
import {
  COURT_SURFACES,
  MAX_BOOKING_MINUTES,
  MIN_BOOKING_MINUTES,
  SPORTS,
  type CourtSurface,
  type Sport,
} from './consts';

/**
 * The owner's side of the inventory: what a venue sells, when it is open, and what it costs.
 * Everything here is behind a venue permission — see `domain/authz/venueAccess` — and none of
 * it is reachable without a membership row.
 */

/** 'HH:mm', venue-local. Seconds are meaningless for an opening time and invite drift. */
export const localTimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use a 24-hour time like 17:00');

/** 0 = Monday, matching `opening_windows.day_of_week` and `price_rules.day_of_week`. */
export const dayOfWeekSchema = z.coerce.number().int().min(0).max(6);

// ---------------------------------------------------------------- price rules

export type PriceRuleSummary = {
  id: number;
  courtId: number;
  priority: number;
  dayOfWeek: number | null;
  startsAt: string | null;
  endsAt: string | null;
  validFrom: string | null;
  validTo: string | null;
  memberOnly: boolean;
  ratePerHourCents: number;
};

/**
 * A window is both bounds or neither, and a date range is each bound independently. They differ
 * because a half-open time window has no meaning ("from 5pm until when?") while a half-open
 * date range has two useful ones — a price rise and a promotion.
 */
export const upsertPriceRuleBodySchema = z
  .object({
    priority: z.coerce.number().int().min(0).max(1000).default(0),
    dayOfWeek: dayOfWeekSchema.nullable().default(null),
    startsAt: localTimeSchema.nullable().default(null),
    endsAt: localTimeSchema.nullable().default(null),
    validFrom: isoDateSchema.nullable().default(null),
    validTo: isoDateSchema.nullable().default(null),
    memberOnly: z.boolean().default(false),
    ratePerHourCents: z.coerce.number().int().nonnegative().max(10_000_000),
  })
  .refine(body => (body.startsAt === null) === (body.endsAt === null), {
    path: ['endsAt'],
    message: 'Give both a start and an end time, or neither',
  })
  .refine(body => body.startsAt === null || body.endsAt === null || body.endsAt > body.startsAt, {
    path: ['endsAt'],
    // Overnight windows are not supported anywhere in the stack; two rules express one.
    message: 'The end time must be after the start. For an overnight rate, add two rules.',
  })
  .refine(body => body.validFrom === null || body.validTo === null || body.validTo >= body.validFrom, {
    path: ['validTo'],
    message: 'The last day cannot be before the first',
  });

export type UpsertPriceRuleBody = z.infer<typeof upsertPriceRuleBodySchema>;

// ------------------------------------------------------------- opening windows

export type OpeningWindowSummary = {
  id: number;
  dayOfWeek: number;
  startsAt: string;
  durationMinutes: number;
};

/**
 * Replaced wholesale rather than edited one at a time. A week's opening hours are read and
 * reasoned about as a set — "we open at eight except Sundays" — and a partial update leaves
 * the owner staring at a form that disagrees with what is stored.
 */
export const replaceOpeningWindowsBodySchema = z.object({
  windows: z
    .array(
      z.object({
        dayOfWeek: dayOfWeekSchema,
        startsAt: localTimeSchema,
        // A week, so a single 24/7 window stays expressible as (0, '00:00', 10080).
        durationMinutes: z.coerce.number().int().positive().max(10_080),
      })
    )
    .max(50),
});

export type ReplaceOpeningWindowsBody = z.infer<typeof replaceOpeningWindowsBodySchema>;

// ------------------------------------------------------------------- courts

export type OwnedCourt = {
  id: number;
  name: string;
  sport: Sport;
  surface: CourtSurface;
  minDurationMinutes: number;
  maxDurationMinutes: number;
  incrementMinutes: number;
  bufferMinutes: number;
  /** Archived courts stay listed for the owner — they are hidden from players, not from staff. */
  isArchived: boolean;
};

export const upsertCourtBodySchema = z
  .object({
    name: z.string().trim().min(1, 'A court needs a name').max(80),
    sport: z.enum(SPORTS),
    surface: z.enum(COURT_SURFACES),
    minDurationMinutes: z.coerce.number().int().min(MIN_BOOKING_MINUTES).max(MAX_BOOKING_MINUTES).default(60),
    maxDurationMinutes: z.coerce.number().int().min(MIN_BOOKING_MINUTES).max(MAX_BOOKING_MINUTES).default(240),
    incrementMinutes: z.coerce.number().int().min(5).max(240).default(30),
    bufferMinutes: z.coerce.number().int().min(0).max(120).default(0),
  })
  .refine(body => body.minDurationMinutes <= body.maxDurationMinutes, {
    path: ['maxDurationMinutes'],
    message: 'The longest booking cannot be shorter than the shortest',
  });

export type UpsertCourtBody = z.infer<typeof upsertCourtBodySchema>;

/** What the owner's pricing screen loads in one go. */
export type CourtPricingResponse = {
  courtId: number;
  courtName: string;
  venueTimezone: string;
  rules: PriceRuleSummary[];
  openingWindows: OpeningWindowSummary[];
};
