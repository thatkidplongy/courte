import { DateTime } from 'luxon';

import { listStartTimes } from './listStartTimes';
import type { Interval } from './types';

export type CanStartAtParams = {
  free: Interval[];
  durationMinutes: number;
  incrementMinutes: number;
  /** Starts earlier than this do not count — a slot in the past cannot be asked for. */
  notBefore: number;
  /** The searched day as `yyyy-MM-dd`, read in `timezone`. */
  date: string;
  /** The wall-clock start the player asked for, `HH:mm`. */
  time: string;
  /** The venue's zone, not the market's: a venue keeps its own clock. */
  timezone: string;
  limit: number;
};

/**
 * Whether a court can begin a game at a requested wall-clock time.
 *
 * It asks `listStartTimes` rather than testing the free intervals directly, because a start is
 * only real if it also lands on the court's increment grid and leaves room for its minimum
 * duration. That is the same rule the bookable chips are drawn from, so a court the filter
 * keeps is a court whose card then shows the chip — one rule, two answers.
 *
 * An unparseable time is no match rather than an error: the value reaches here from a query
 * string, and a search that returns nothing is a better answer than a search that throws.
 */
export const canStartAt = (params: CanStartAtParams): boolean => {
  const wanted = DateTime.fromISO(`${params.date}T${params.time}`, { zone: params.timezone });
  if (!wanted.isValid) return false;

  const starts = listStartTimes({
    free: params.free,
    durationMinutes: params.durationMinutes,
    incrementMinutes: params.incrementMinutes,
    notBefore: params.notBefore,
    limit: params.limit,
  });

  return starts.includes(wanted.toMillis());
};
