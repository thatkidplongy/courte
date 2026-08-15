import type { PoolClient } from 'pg';

import type { BookingSource } from '@courte/contract';

import { query, withTransaction } from '@/db/client';
import { isOverlapViolation, isUniqueViolation } from '@/db/errors';
import type { SeriesTemplate } from '@/domain/recurrence/materialiseSeries';

type SeriesRow = {
  id: number;
  created_by: number;
  venue_id: number;
  rrule: string;
  timezone: string;
  dtstart: string;
  materialised_until: string;
  duration_minutes: number;
  source: BookingSource;
  court_ids: number[];
  buffer_minutes: number;
};

const toTemplate = (row: SeriesRow): SeriesTemplate => ({
  id: row.id,
  createdBy: row.created_by,
  venueId: row.venue_id,
  rrule: row.rrule,
  timezone: row.timezone,
  dtstart: new Date(row.dtstart),
  durationMinutes: row.duration_minutes,
  source: row.source,
  courtIds: row.court_ids,
  courtBufferMinutes: row.buffer_minutes,
});

const SERIES_SELECT = `
  SELECT s.id, s.created_by, s.venue_id, s.rrule, s.timezone,
         s.dtstart::text AS dtstart, s.materialised_until::text AS materialised_until,
         s.duration_minutes, s.source,
         array_agg(sc.court_id ORDER BY sc.court_id) AS court_ids,
         max(c.buffer_minutes)::int AS buffer_minutes
  FROM "BookingSeries" s
  JOIN "BookingSeriesCourt" sc ON sc.series_id = s.id
  JOIN "Court" c ON c.id = sc.court_id
`;

export type InsertSeriesParams = {
  createdBy: number;
  venueId: number;
  rrule: string;
  timezone: string;
  dtstart: Date;
  durationMinutes: number;
  source: BookingSource;
  courtIds: number[];
};

export const insertSeries = async (params: InsertSeriesParams): Promise<number> => {
  return withTransaction(async client => {
    const result = await client.query<{ id: number }>(
      `
      INSERT INTO "BookingSeries" (created_by, venue_id, rrule, timezone, dtstart, materialised_until,
                                  duration_minutes, source)
      VALUES ($1, $2, $3, $4, $5, $5, $6, $7)
      RETURNING id
      `,
      [
        params.createdBy,
        params.venueId,
        params.rrule,
        params.timezone,
        params.dtstart.toISOString(),
        params.durationMinutes,
        params.source,
      ]
    );

    const seriesId = result.rows[0]?.id;
    if (!seriesId) throw new Error('series insert returned no id');

    for (const courtId of params.courtIds) {
      await client.query('INSERT INTO "BookingSeriesCourt" (series_id, court_id) VALUES ($1, $2)', [seriesId, courtId]);
    }

    return seriesId;
  });
};

export const findSeriesById = async (seriesId: number): Promise<SeriesTemplate | null> => {
  const rows = await query<SeriesRow>(`${SERIES_SELECT} WHERE s.id = $1 GROUP BY s.id`, [seriesId]);
  const row = rows[0];
  return row ? toTemplate(row) : null;
};

/** Feeds the horizon job: series whose materialised future has shrunk below the target. */
export const findSeriesNeedingMaterialisation = async (before: Date, limit: number): Promise<SeriesTemplate[]> => {
  const rows = await query<SeriesRow>(
    `${SERIES_SELECT} WHERE s.materialised_until < $1 GROUP BY s.id ORDER BY s.materialised_until ASC LIMIT $2`,
    [before.toISOString(), limit]
  );
  return rows.map(toTemplate);
};

export const advanceSeriesHorizon = async (seriesId: number, until: Date): Promise<void> => {
  // GREATEST guards a stale job re-run from dragging the horizon backwards.
  await query('UPDATE "BookingSeries" SET materialised_until = GREATEST(materialised_until, $2) WHERE id = $1', [
    seriesId,
    until.toISOString(),
  ]);
};

export type OccurrenceInsert = {
  series: SeriesTemplate;
  occurrenceStart: Date;
  occurrenceEnd: Date;
  quote: { totalCents: number; snapshot: Record<string, unknown> };
};

/**
 * The db-side half of materialiseSeries' insertOccurrence port. One transaction per
 * occurrence; the outcome is read off the database's own verdicts — the unique index says
 * "already materialised", the exclusion constraint says "slot taken" — never off a pre-check.
 */
export const insertSeriesOccurrence = async (
  params: OccurrenceInsert
): Promise<'created' | 'already-exists' | 'conflict'> => {
  const bufferMs = params.series.courtBufferMinutes * 60_000;

  try {
    await withTransaction(async (client: PoolClient) => {
      const booking = await client.query<{ id: number }>(
        `
        INSERT INTO "Booking" (series_id, occurrence_start, user_id, venue_id, status, source,
                              total_cents, rate_snapshot)
        VALUES ($1, $2, $3, $4, 'confirmed', $5, $6, $7)
        RETURNING id
        `,
        [
          params.series.id,
          params.occurrenceStart.toISOString(),
          params.series.createdBy,
          params.series.venueId,
          params.series.source,
          params.quote.totalCents,
          JSON.stringify(params.quote.snapshot),
        ]
      );

      const bookingId = booking.rows[0]?.id;
      if (!bookingId) throw new Error('occurrence booking insert returned no id');

      for (const courtId of params.series.courtIds) {
        await client.query(
          `
          INSERT INTO "Reservation" (court_id, booking_id, kind, during, play_during)
          VALUES ($1, $2, 'booking', tstzrange($3, $4), tstzrange($5, $6))
          `,
          [
            courtId,
            bookingId,
            new Date(params.occurrenceStart.getTime() - bufferMs).toISOString(),
            new Date(params.occurrenceEnd.getTime() + bufferMs).toISOString(),
            params.occurrenceStart.toISOString(),
            params.occurrenceEnd.toISOString(),
          ]
        );
      }
    });

    return 'created';
  } catch (error) {
    if (isUniqueViolation(error)) return 'already-exists';
    if (isOverlapViolation(error)) return 'conflict';
    throw error;
  }
};
