import { query } from '@/db/client';

export type VenueSummary = {
  id: string;
  name: string;
  timezone: string;
};

/** One venue's identity for the dashboard header. A missing row is the caller's 404 to raise. */
export const findVenueSummary = async (venueId: string): Promise<VenueSummary | null> => {
  const rows = await query<VenueSummary>('SELECT id, name, timezone FROM venues WHERE id = $1', [venueId]);
  return rows[0] ?? null;
};

/** venue id -> IANA timezone, bulk. */
export const findVenueTimezones = async (venueIds: string[]): Promise<Map<string, string>> => {
  if (venueIds.length === 0) return new Map();

  const rows = await query<{ id: string; timezone: string }>(
    'SELECT id, timezone FROM venues WHERE id = ANY($1::uuid[])',
    [venueIds]
  );

  return new Map(rows.map(row => [row.id, row.timezone]));
};

/** court id -> venue id, bulk. Feeds the sweep: released holds only know their court. */
export const findVenueIdsForCourts = async (courtIds: string[]): Promise<Map<string, string>> => {
  if (courtIds.length === 0) return new Map();

  const rows = await query<{ id: string; venue_id: string }>(
    'SELECT id, venue_id FROM courts WHERE id = ANY($1::uuid[])',
    [courtIds]
  );

  return new Map(rows.map(row => [row.id, row.venue_id]));
};
