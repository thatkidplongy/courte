/**
 * Live smoke test for series materialisation. Not part of the test suite — run manually:
 *   set -a && source .env.local && set +a && pnpm dlx tsx scripts/smoke-series.ts
 * Creates a 6-week league series with a blackout on week 3, materialises, verifies pricing
 * and idempotency, cleans up after itself.
 */
import { closePool, query } from '../src/db/client';
import { findSeriesById, insertSeries } from '../src/db/repositories/seriesRepository';
import { materialiseOneSeries } from '../src/jobs/extendHorizons';

const COURT = '00000000-0000-0000-0000-0000000000d2'; // badminton: 15-min buffer, weekday 17-22 peak
const VENUE = '00000000-0000-0000-0000-0000000000c2';
const USER = '00000000-0000-0000-0000-0000000000b1';

const main = async () => {
  const seriesId = await insertSeries({
    createdBy: USER,
    venueId: VENUE,
    rrule: 'FREQ=WEEKLY;BYDAY=TU;COUNT=6',
    timezone: 'Asia/Manila',
    dtstart: new Date('2026-08-11T11:00:00Z'), // 19:00 Manila — inside the peak band
    durationMinutes: 120,
    source: 'online',
    courtIds: [COURT],
  });

  await query(
    `INSERT INTO reservations (court_id, kind, during, play_during, reason)
     VALUES ($1, 'blackout', tstzrange('2026-08-25 10:00+00','2026-08-25 14:00+00'),
             tstzrange('2026-08-25 10:00+00','2026-08-25 14:00+00'), 'resurfacing')`,
    [COURT]
  );

  const series = await findSeriesById(seriesId);
  if (!series) throw new Error('series not found');

  const horizon = new Date('2027-08-01T00:00:00Z');
  const result = await materialiseOneSeries(series, horizon);
  console.log('created :', result.created.map(d => d.toISOString()).join(', '));
  console.log('conflict:', result.conflicts.map(d => d.toISOString()).join(', '));

  const priced = await query<{ start: string; total_cents: number }>(
    'SELECT occurrence_start::text AS start, total_cents FROM bookings WHERE series_id = $1 ORDER BY occurrence_start',
    [seriesId]
  );
  console.log('priced  :', priced.map(row => `${row.start} = ${row.total_cents}`).join(' | '));

  const rerun = await materialiseOneSeries(series, horizon);
  console.log('rerun   :', JSON.stringify({ created: rerun.created.length, skipped: rerun.skipped }));

  await query('DELETE FROM reservations WHERE booking_id IN (SELECT id FROM bookings WHERE series_id = $1)', [
    seriesId,
  ]);
  await query("DELETE FROM reservations WHERE kind = 'blackout' AND court_id = $1", [COURT]);
  await query('DELETE FROM bookings WHERE series_id = $1', [seriesId]);
  await query('DELETE FROM booking_series_courts WHERE series_id = $1', [seriesId]);
  await query('DELETE FROM booking_series WHERE id = $1', [seriesId]);
  await closePool();
};

main().catch(error => {
  console.error(error);
  process.exit(1);
});
