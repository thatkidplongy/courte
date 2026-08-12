import type { BookingSource } from '@courte/contract';

import type { Interval } from '@/domain/availability/types';

import { expandOccurrences } from './expandOccurrences';

/**
 * Turns a series' rule into real bookings-plus-reservations out to a horizon, occurrence by
 * occurrence. Each occurrence is its own transaction on purpose: a league's week 34 clashing
 * with a tournament must not undo weeks 1–33. Conflicts are collected and reported, never
 * silently skipped — "48 booked, 4 conflicts" is the contract, same as Teams.
 *
 * Idempotent by construction: the unique index on (series_id, occurrence_start) turns a
 * re-run into no-ops for occurrences that already exist, so a crashed horizon job can simply
 * run again.
 */

export type SeriesTemplate = {
  id: string;
  createdBy: string;
  venueId: string;
  rrule: string;
  timezone: string;
  dtstart: Date;
  durationMinutes: number;
  source: BookingSource;
  courtIds: string[];
  courtBufferMinutes: number;
};

export type OccurrenceQuote = {
  totalCents: number;
  snapshot: Record<string, unknown>;
};

export type MaterialiseDeps = {
  insertOccurrence(params: {
    series: SeriesTemplate;
    occurrenceStart: Date;
    occurrenceEnd: Date;
    quote: OccurrenceQuote;
  }): Promise<'created' | 'already-exists' | 'conflict'>;
  quoteOccurrence(series: SeriesTemplate, start: Date, end: Date): Promise<OccurrenceQuote>;
  advanceHorizon(seriesId: string, until: Date): Promise<void>;
};

export type MaterialiseParams = {
  series: SeriesTemplate;
  window: Interval;
};

export type MaterialiseResult = {
  created: Date[];
  conflicts: Date[];
  skipped: number;
};

export const materialiseSeries = async (
  deps: MaterialiseDeps,
  params: MaterialiseParams
): Promise<MaterialiseResult> => {
  const occurrences = expandOccurrences({
    rrule: params.series.rrule,
    timezone: params.series.timezone,
    dtstart: params.series.dtstart,
    durationMinutes: params.series.durationMinutes,
    window: params.window,
  });

  const result: MaterialiseResult = { created: [], conflicts: [], skipped: 0 };

  for (const occurrence of occurrences) {
    const quote = await deps.quoteOccurrence(params.series, occurrence.start, occurrence.end);
    const outcome = await deps.insertOccurrence({
      series: params.series,
      occurrenceStart: occurrence.start,
      occurrenceEnd: occurrence.end,
      quote,
    });

    if (outcome === 'created') result.created.push(occurrence.start);
    if (outcome === 'conflict') result.conflicts.push(occurrence.start);
    if (outcome === 'already-exists') result.skipped += 1;
  }

  // The horizon advances even when some occurrences conflicted: those slots were taken by
  // someone else, and re-litigating them on every job run would spam conflicts forever.
  await deps.advanceHorizon(params.series.id, new Date(params.window.end));

  return result;
};
