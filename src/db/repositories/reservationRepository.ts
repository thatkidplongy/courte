import type { PoolClient } from 'pg';

import type { ReservationKind, ReservationState } from '@/consts';
import { query } from '@/db/client';
import type { BlockedInterval } from '@/domain/availability/types';

type ReservationRow = {
  id: string;
  court_id: string;
  booking_id: string | null;
  kind: ReservationKind;
  state: ReservationState;
  during_start: string;
  during_end: string;
  expires_at: string | null;
};

export type Reservation = {
  id: string;
  courtId: string;
  bookingId: string | null;
  kind: ReservationKind;
  state: ReservationState;
  duringStart: Date;
  duringEnd: Date;
  expiresAt: Date | null;
};

const toReservation = (row: ReservationRow): Reservation => ({
  id: row.id,
  courtId: row.court_id,
  bookingId: row.booking_id,
  kind: row.kind,
  state: row.state,
  duringStart: new Date(row.during_start),
  duringEnd: new Date(row.during_end),
  expiresAt: row.expires_at ? new Date(row.expires_at) : null,
});

/**
 * All active blocked time for a set of courts over a range, in one round trip — the bulk
 * feed for getAvailability(). Includes holds and blackouts: a held slot is exactly as
 * unavailable as a booked one until the sweeper releases it.
 */
export const findBlockedIntervals = async (
  courtIds: string[],
  rangeStart: Date,
  rangeEnd: Date
): Promise<BlockedInterval[]> => {
  if (courtIds.length === 0) return [];

  const rows = await query<{ court_id: string; during_start: string; during_end: string }>(
    `
    SELECT court_id, lower(during)::text AS during_start, upper(during)::text AS during_end
    FROM reservations
    WHERE court_id = ANY($1::uuid[])
      AND state = 'active'
      AND during && tstzrange($2, $3)
    `,
    [courtIds, rangeStart.toISOString(), rangeEnd.toISOString()]
  );

  return rows.map(row => ({
    courtId: row.court_id,
    start: new Date(row.during_start).getTime(),
    end: new Date(row.during_end).getTime(),
  }));
};

export type InsertReservationParams = {
  courtId: string;
  bookingId: string;
  kind: Extract<ReservationKind, 'booking' | 'hold'>;
  duringStart: Date;
  duringEnd: Date;
  playStart: Date;
  playEnd: Date;
  expiresAt: Date | null;
};

/**
 * The insert that the exclusion constraint arbitrates. Deliberately no availability pre-check
 * here — the constraint IS the check, and this call throwing 23P01 is the normal way a lost
 * race surfaces (docs/adr/0002). Runs on the caller's transaction client so a multi-court
 * booking aborts as a unit.
 */
export const insertReservation = async (client: PoolClient, params: InsertReservationParams): Promise<string> => {
  const result = await client.query<{ id: string }>(
    `
    INSERT INTO reservations (court_id, booking_id, kind, during, play_during, expires_at)
    VALUES ($1, $2, $3, tstzrange($4, $5), tstzrange($6, $7), $8)
    RETURNING id
    `,
    [
      params.courtId,
      params.bookingId,
      params.kind,
      params.duringStart.toISOString(),
      params.duringEnd.toISOString(),
      params.playStart.toISOString(),
      params.playEnd.toISOString(),
      params.expiresAt?.toISOString() ?? null,
    ]
  );

  const id = result.rows[0]?.id;
  if (!id) throw new Error('reservation insert returned no id');
  return id;
};

/**
 * Flips a hold into a confirmed booking's reservation. Scoped to active, unexpired holds on
 * the given booking: an expired hold returns zero rows and the caller decides what that means.
 */
export const promoteHoldsToBooking = async (client: PoolClient, bookingId: string): Promise<number> => {
  const result = await client.query(
    `
    UPDATE reservations
    SET kind = 'booking', expires_at = NULL
    WHERE booking_id = $1
      AND kind = 'hold'
      AND state = 'active'
      AND expires_at > now()
    `,
    [bookingId]
  );

  return result.rowCount ?? 0;
};

export const releaseReservationsForBooking = async (client: PoolClient, bookingId: string): Promise<Reservation[]> => {
  const result = await client.query<ReservationRow>(
    `
    UPDATE reservations
    SET state = 'released'
    WHERE booking_id = $1 AND state = 'active'
    RETURNING id, court_id, booking_id, kind, state,
              lower(during)::text AS during_start, upper(during)::text AS during_end,
              expires_at::text AS expires_at
    `,
    [bookingId]
  );

  return result.rows.map(toReservation);
};

/**
 * The sweeper's query: release every hold past its expiry, returning what was freed so the
 * waitlist can be offered those ranges. Exclusion predicates cannot reference now(), so
 * expiry is enforced here, on a schedule, rather than declaratively (docs/adr/0002).
 */
export const releaseExpiredHolds = async (): Promise<Reservation[]> => {
  const rows = await query<ReservationRow>(
    `
    UPDATE reservations
    SET state = 'released'
    WHERE kind = 'hold'
      AND state = 'active'
      AND expires_at <= now()
    RETURNING id, court_id, booking_id, kind, state,
              lower(during)::text AS during_start, upper(during)::text AS during_end,
              expires_at::text AS expires_at
    `
  );

  return rows.map(toReservation);
};
