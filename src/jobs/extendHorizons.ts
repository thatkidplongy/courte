import { env } from '@/config/env';
import { findPriceRulesForCourts } from '@/db/repositories/priceRuleRepository';
import {
  advanceSeriesHorizon,
  findSeriesNeedingMaterialisation,
  insertSeriesOccurrence,
} from '@/db/repositories/seriesRepository';
import { findVenueTimezones } from '@/db/repositories/venueRepository';
import { materialiseSeries, type SeriesTemplate } from '@/domain/recurrence/materialiseSeries';
import { resolveQuote } from '@/domain/pricing/resolveQuote';
import { logger } from '@/lib/logger';

const SERIES_PER_RUN = 50;

/**
 * Keeps every series materialised out to the configured horizon. Runs daily; also invoked
 * inline when a series is first created so the initial occurrences exist immediately.
 * Occurrence inserts are idempotent (unique index), so overlapping runs are harmless.
 */
export const extendHorizons = async (): Promise<{ series: number; created: number; conflicts: number }> => {
  const horizon = new Date(Date.now() + env.RECURRENCE_HORIZON_DAYS * 86_400_000);
  const dueSeries = await findSeriesNeedingMaterialisation(horizon, SERIES_PER_RUN);

  let created = 0;
  let conflicts = 0;

  for (const series of dueSeries) {
    const result = await materialiseOneSeries(series, horizon);
    created += result.created.length;
    conflicts += result.conflicts.length;
  }

  if (dueSeries.length > 0) {
    logger.info({ series: dueSeries.length, created, conflicts }, 'series horizons extended');
  }

  return { series: dueSeries.length, created, conflicts };
};

export const materialiseOneSeries = async (series: SeriesTemplate, horizon: Date) => {
  const [rules, timezones] = await Promise.all([
    findPriceRulesForCourts(series.courtIds),
    findVenueTimezones([series.venueId]),
  ]);
  const timezone = timezones.get(series.venueId) ?? series.timezone;

  return materialiseSeries(
    {
      insertOccurrence: insertSeriesOccurrence,
      quoteOccurrence: async (template, start, end) => {
        // A series occurrence's price is the sum over its courts — a league booking two
        // courts pays for both. Rules are fetched once per series, not per occurrence.
        let totalCents = 0;
        const perCourt: Record<string, unknown>[] = [];

        for (const courtId of template.courtIds) {
          const quote = resolveQuote({
            rules: rules.filter(rule => rule.courtId === courtId),
            requested: { start: start.getTime(), end: end.getTime() },
            timezone,
            isMember: false,
          });
          totalCents += quote.totalCents;
          perCourt.push({ courtId, ...quote.snapshot });
        }

        return { totalCents, snapshot: { courts: perCourt } };
      },
      advanceHorizon: advanceSeriesHorizon,
    },
    {
      series,
      window: { start: Math.max(Date.now(), series.dtstart.getTime()), end: horizon.getTime() },
    }
  );
};
