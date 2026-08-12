import type { WaitlistState } from '@courte/contract';

import { query } from '@/db/client';
import type { WaitlistCandidate } from '@/domain/waitlist/matchOffers';

type CandidateRow = {
  id: string;
  court_id: string | null;
  venue_id: string | null;
  desired_start: string;
  desired_end: string;
  min_duration_minutes: number;
  created_at: string;
};

/**
 * Waiting entries whose desired range overlaps any of the released ranges, for the courts'
 * venue. One bulk query per sweep — the matching itself is pure (domain/waitlist).
 */
export const findWaitingCandidates = async (
  venueIds: string[],
  rangeStart: Date,
  rangeEnd: Date
): Promise<WaitlistCandidate[]> => {
  if (venueIds.length === 0) return [];

  const rows = await query<CandidateRow>(
    `
    SELECT w.id, w.court_id, w.venue_id,
           lower(w.desired)::text AS desired_start, upper(w.desired)::text AS desired_end,
           w.min_duration_minutes, w.created_at::text AS created_at
    FROM waitlist_entries w
    WHERE w.state = 'waiting'
      AND w.desired && tstzrange($2, $3)
      AND (w.venue_id = ANY($1::uuid[])
           OR w.court_id IN (SELECT id FROM courts WHERE venue_id = ANY($1::uuid[])))
    ORDER BY w.created_at ASC
    `,
    [venueIds, rangeStart.toISOString(), rangeEnd.toISOString()]
  );

  return rows.map(row => ({
    id: row.id,
    courtId: row.court_id,
    venueId: row.venue_id,
    desired: { start: new Date(row.desired_start).getTime(), end: new Date(row.desired_end).getTime() },
    minDurationMinutes: row.min_duration_minutes,
    createdAt: new Date(row.created_at),
  }));
};

export type OfferToRecord = {
  entryId: string;
  courtId: string;
  interval: { start: number; end: number };
};

/**
 * State-guarded so a concurrent sweep cannot double-offer: only rows still 'waiting' flip,
 * and the returned count says how many actually did. The offered court and range are stored
 * so the player's "book it now" link knows what it points at.
 */
export const markOffered = async (offers: OfferToRecord[], claimExpiresAt: Date): Promise<number> => {
  let recorded = 0;

  for (const offer of offers) {
    const rows = await query<{ id: string }>(
      `
      UPDATE waitlist_entries
      SET state = 'offered', offered_at = now(), claim_expires_at = $2,
          offered_court_id = $3, offered_during = tstzrange($4, $5)
      WHERE id = $1 AND state = 'waiting'
      RETURNING id
      `,
      [
        offer.entryId,
        claimExpiresAt.toISOString(),
        offer.courtId,
        new Date(offer.interval.start).toISOString(),
        new Date(offer.interval.end).toISOString(),
      ]
    );
    recorded += rows.length;
  }

  return recorded;
};

/** Lapsed offers rejoin the queue as fresh waiters so the next sweep offers to someone else. */
export const expireLapsedOffers = async (): Promise<number> => {
  const rows = await query<{ id: string }>(
    `
    UPDATE waitlist_entries
    SET state = 'waiting', offered_at = NULL, claim_expires_at = NULL,
        offered_court_id = NULL, offered_during = NULL
    WHERE state = 'offered' AND claim_expires_at <= now()
    RETURNING id
    `
  );

  return rows.length;
};

export type InsertWaitlistParams = {
  userId: string;
  courtId: string;
  desiredStart: Date;
  desiredEnd: Date;
  minDurationMinutes: number;
};

export const insertWaitlistEntry = async (params: InsertWaitlistParams): Promise<string> => {
  const rows = await query<{ id: string }>(
    `
    INSERT INTO waitlist_entries (user_id, court_id, desired, min_duration_minutes)
    VALUES ($1, $2, tstzrange($3, $4), $5)
    RETURNING id
    `,
    [
      params.userId,
      params.courtId,
      params.desiredStart.toISOString(),
      params.desiredEnd.toISOString(),
      params.minDurationMinutes,
    ]
  );

  const id = rows[0]?.id;
  if (!id) throw new Error('waitlist insert returned no id');
  return id;
};

type UserEntryRow = {
  id: string;
  state: WaitlistState;
  desired_start: string;
  desired_end: string;
  court_name: string;
  venue_name: string;
  venue_timezone: string;
  offered_court_id: string | null;
  offered_start: string | null;
  claim_expires_at: string | null;
};

export type UserWaitlistEntry = {
  id: string;
  /** Native waitlist_state enum column, so the union is exact rather than a loose string. */
  state: WaitlistState;
  desiredStart: Date;
  desiredEnd: Date;
  courtName: string;
  venueName: string;
  venueTimezone: string;
  offeredCourtId: string | null;
  offeredStart: Date | null;
  claimExpiresAt: Date | null;
};

export const findWaitlistEntriesForUser = async (userId: string): Promise<UserWaitlistEntry[]> => {
  const rows = await query<UserEntryRow>(
    `
    SELECT w.id, w.state,
           lower(w.desired)::text AS desired_start, upper(w.desired)::text AS desired_end,
           c.name AS court_name, v.name AS venue_name, v.timezone AS venue_timezone,
           w.offered_court_id, lower(w.offered_during)::text AS offered_start,
           w.claim_expires_at::text AS claim_expires_at
    FROM waitlist_entries w
    JOIN courts c ON c.id = w.court_id
    JOIN venues v ON v.id = c.venue_id
    WHERE w.user_id = $1 AND w.state IN ('waiting', 'offered')
    ORDER BY lower(w.desired) ASC
    `,
    [userId]
  );

  return rows.map(row => ({
    id: row.id,
    state: row.state,
    desiredStart: new Date(row.desired_start),
    desiredEnd: new Date(row.desired_end),
    courtName: row.court_name,
    venueName: row.venue_name,
    venueTimezone: row.venue_timezone,
    offeredCourtId: row.offered_court_id,
    offeredStart: row.offered_start ? new Date(row.offered_start) : null,
    claimExpiresAt: row.claim_expires_at ? new Date(row.claim_expires_at) : null,
  }));
};
