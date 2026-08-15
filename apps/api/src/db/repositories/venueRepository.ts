import type { VenuePhoto } from '@courte/contract';

import { query } from '@/db/client';

export type VenueSummary = {
  id: number;
  name: string;
  address: string;
  timezone: string;
  /** Owner-written. Null for most venues — every consumer renders this conditionally. */
  description: string | null;
  phone: string | null;
  website: string | null;
};

/**
 * One venue's identity, for the dashboard header and the public court page. A missing row is
 * the caller's 404 to raise — and an archived venue is a missing row, which is what makes
 * retiring a venue take its dashboard and its public page down together.
 */
export const findVenueSummary = async (venueId: number): Promise<VenueSummary | null> => {
  const rows = await query<VenueSummary>(
    'SELECT id, name, address, timezone, description, phone, website FROM "Venue" WHERE id = $1 AND deleted_at IS NULL',
    [venueId]
  );
  return rows[0] ?? null;
};

/**
 * A venue's photos, court-specific ones included. Ordering is the whole contract: the first
 * row is the primary photo, which is why there is no is_primary flag to disagree with it.
 */
export const findVenuePhotos = (venueId: number): Promise<VenuePhoto[]> =>
  query<VenuePhoto>(
    `
    SELECT url, alt
    FROM "VenuePhoto"
    WHERE venue_id = $1 AND deleted_at IS NULL
    ORDER BY sort_order, id
    `,
    [venueId]
  );

/** venue id -> IANA timezone, bulk. */
export const findVenueTimezones = async (venueIds: number[]): Promise<Map<number, string>> => {
  if (venueIds.length === 0) return new Map();

  const rows = await query<{ id: number; timezone: string }>(
    'SELECT id, timezone FROM "Venue" WHERE id = ANY($1::bigint[])',
    [venueIds]
  );

  return new Map(rows.map(row => [row.id, row.timezone]));
};

/** court id -> venue id, bulk. Feeds the sweep: released holds only know their court. */
export const findVenueIdsForCourts = async (courtIds: number[]): Promise<Map<number, number>> => {
  if (courtIds.length === 0) return new Map();

  const rows = await query<{ id: number; venue_id: number }>(
    'SELECT id, venue_id FROM "Court" WHERE id = ANY($1::bigint[])',
    [courtIds]
  );

  return new Map(rows.map(row => [row.id, row.venue_id]));
};
