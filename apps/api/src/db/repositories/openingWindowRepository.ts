import type { OpeningWindowSummary } from '@courte/contract';

import { query, withTransaction } from '@/db/client';
import type { OpeningWindow } from '@/domain/availability/types';

/**
 * A court's weekly opening hours. Split from courtRepository because these change for their own
 * reasons — an owner editing the week has nothing to do with the marketplace query that reads
 * courts — and because that file had grown to hold four separate subjects.
 */

type OpeningWindowRow = {
  court_id: number;
  day_of_week: number;
  starts_at: string;
  duration_minutes: number;
};

/**
 * Bulk-loaded for every court in a search at once. Fetching these per court is the N+1 that
 * makes the results page slow, and it is the reason this takes an array.
 */
export const findOpeningWindowsForCourts = async (courtIds: number[]): Promise<OpeningWindow[]> => {
  if (courtIds.length === 0) return [];

  const rows = await query<OpeningWindowRow>(
    `
    SELECT court_id, day_of_week, starts_at::text AS starts_at, duration_minutes
    FROM "OpeningWindow"
    WHERE court_id = ANY($1::bigint[])
    ORDER BY court_id, day_of_week, starts_at
    `,
    [courtIds]
  );

  return rows.map(row => ({
    courtId: row.court_id,
    dayOfWeek: row.day_of_week,
    startsAt: row.starts_at,
    durationMinutes: row.duration_minutes,
  }));
};

export const findOpeningWindowsForCourt = async (courtId: number): Promise<OpeningWindowSummary[]> => {
  const rows = await query<OpeningWindowSummary & { starts_at: string }>(
    `
    SELECT id, day_of_week AS "dayOfWeek", starts_at::text AS starts_at, duration_minutes AS "durationMinutes"
    FROM "OpeningWindow"
    WHERE court_id = $1
    ORDER BY day_of_week, starts_at
    `,
    [courtId]
  );

  // Postgres hands back 'HH:MM:SS'; the contract's shape is 'HH:MM', which is what a form posts.
  return rows.map(row => ({ ...row, startsAt: row.starts_at.slice(0, 5) }));
};

/**
 * Replace, not merge — the caller sends the whole week and gets the whole week. In one
 * transaction, so a failed insert cannot leave a court with no hours at all, which would read
 * to every player as permanently closed.
 */
export const replaceOpeningWindows = async (
  courtId: number,
  windows: Array<{ dayOfWeek: number; startsAt: string; durationMinutes: number }>
): Promise<void> => {
  await withTransaction(async client => {
    await client.query('DELETE FROM "OpeningWindow" WHERE court_id = $1', [courtId]);
    if (windows.length === 0) return;

    // One statement with unnested arrays rather than a loop: a week is up to seven round trips
    // otherwise, inside a transaction holding a lock the whole time.
    await client.query(
      `
      INSERT INTO "OpeningWindow" (court_id, day_of_week, starts_at, duration_minutes)
      SELECT $1, day, start_at::time, minutes
      FROM unnest($2::int[], $3::text[], $4::int[]) AS w(day, start_at, minutes)
      `,
      [
        courtId,
        windows.map(window => window.dayOfWeek),
        windows.map(window => window.startsAt),
        windows.map(window => window.durationMinutes),
      ]
    );
  });
};
