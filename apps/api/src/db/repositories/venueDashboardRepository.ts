import type { BookingSource, BookingStatus, PaymentState } from '@courte/contract';

import { query, withTransaction } from '@/db/client';
import { isOverlapViolation } from '@/db/errors';

/** Queries that exist only for the manage dashboard. All scoped by venue_id in SQL. */

type VenueBookingRow = {
  id: string;
  court_name: string;
  customer: string;
  status: BookingStatus;
  source: BookingSource;
  total_cents: number;
  paid_cents: number;
  payment_state: PaymentState;
  play_start: string;
  play_end: string;
};

export type VenueBooking = {
  id: string;
  courtName: string;
  customer: string;
  status: BookingStatus;
  source: BookingSource;
  totalCents: number;
  paidCents: number;
  paymentState: PaymentState;
  playStart: Date;
  playEnd: Date;
};

export const findVenueBookings = async (venueId: string, from: Date, to: Date): Promise<VenueBooking[]> => {
  const rows = await query<VenueBookingRow>(
    `
    SELECT b.id,
           string_agg(DISTINCT c.name, ', ') AS court_name,
           COALESCE(u.name, b.customer_name, 'Unknown') AS customer,
           b.status, b.source, b.total_cents, ps.paid_cents, ps.payment_state,
           min(lower(r.play_during))::text AS play_start,
           max(upper(r.play_during))::text AS play_end
    FROM bookings b
    JOIN booking_payment_state ps ON ps.booking_id = b.id
    LEFT JOIN users u ON u.id = b.user_id
    JOIN reservations r ON r.booking_id = b.id AND r.state = 'active'
    JOIN courts c ON c.id = r.court_id
    WHERE b.venue_id = $1
      AND r.play_during && tstzrange($2, $3)
      AND b.status IN ('pending', 'confirmed', 'completed', 'no_show')
    GROUP BY b.id, u.name, ps.paid_cents, ps.payment_state
    ORDER BY min(lower(r.play_during)) ASC
    `,
    [venueId, from.toISOString(), to.toISOString()]
  );

  return rows.map(row => ({
    id: row.id,
    courtName: row.court_name,
    customer: row.customer,
    status: row.status,
    source: row.source,
    totalCents: row.total_cents,
    paidCents: row.paid_cents,
    paymentState: row.payment_state,
    playStart: new Date(row.play_start),
    playEnd: new Date(row.play_end),
  }));
};

export type VenueStats = {
  bookingsToday: number;
  upcomingWeek: number;
  collectedThisMonthCents: number;
};

export const getVenueStats = async (
  venueId: string,
  dayStart: Date,
  dayEnd: Date,
  weekEnd: Date,
  monthStart: Date
): Promise<VenueStats> => {
  const rows = await query<{ bookings_today: string; upcoming_week: string; collected_month: string }>(
    `
    SELECT
      (SELECT count(DISTINCT b.id) FROM bookings b
        JOIN reservations r ON r.booking_id = b.id AND r.state = 'active'
        WHERE b.venue_id = $1 AND b.status IN ('pending','confirmed','completed')
          AND r.play_during && tstzrange($2, $3)) AS bookings_today,
      (SELECT count(DISTINCT b.id) FROM bookings b
        JOIN reservations r ON r.booking_id = b.id AND r.state = 'active'
        WHERE b.venue_id = $1 AND b.status IN ('pending','confirmed')
          AND r.play_during && tstzrange($3, $4)) AS upcoming_week,
      (SELECT COALESCE(SUM(CASE WHEN p.kind = 'charge' THEN p.amount_cents ELSE -p.amount_cents END), 0)
        FROM payments p JOIN bookings b ON b.id = p.booking_id
        WHERE b.venue_id = $1 AND p.created_at >= $5) AS collected_month
    `,
    [venueId, dayStart.toISOString(), dayEnd.toISOString(), weekEnd.toISOString(), monthStart.toISOString()]
  );

  const row = rows[0];
  return {
    bookingsToday: Number(row?.bookings_today ?? 0),
    upcomingWeek: Number(row?.upcoming_week ?? 0),
    collectedThisMonthCents: Number(row?.collected_month ?? 0),
  };
};

/**
 * Bookings per venue-local hour of day. Grouped in Postgres rather than in JS because the
 * alternative is shipping every reservation in the window across the wire to count them, and
 * the DST-correct local hour is something the database already knows how to compute.
 *
 * Always returns 24 rows: an hour with no bookings is a zero, not a missing key, so the chart
 * never has to guess whether a gap means "closed" or "no data".
 */
export const getVenueUtilisationByHour = async (
  venueId: string,
  from: Date,
  to: Date,
  timezone: string
): Promise<Array<{ hour: number; bookings: number }>> => {
  const rows = await query<{ hour: string; bookings: string }>(
    `
    WITH hours AS (SELECT generate_series(0, 23) AS hour)
    SELECT
      hours.hour,
      COALESCE(counted.bookings, 0) AS bookings
    FROM hours
    LEFT JOIN (
      SELECT
        EXTRACT(HOUR FROM lower(r.play_during) AT TIME ZONE $4)::int AS hour,
        count(DISTINCT b.id) AS bookings
      FROM bookings b
      JOIN reservations r ON r.booking_id = b.id AND r.state = 'active'
      WHERE b.venue_id = $1
        AND b.status IN ('pending','confirmed','completed')
        AND r.play_during && tstzrange($2, $3)
      GROUP BY 1
    ) counted ON counted.hour = hours.hour
    ORDER BY hours.hour
    `,
    [venueId, from.toISOString(), to.toISOString(), timezone]
  );

  return rows.map(row => ({ hour: Number(row.hour), bookings: Number(row.bookings) }));
};

export type WalkInInsert = {
  venueId: string;
  courtId: string;
  customerName: string;
  recordedBy: string;
  source: Extract<BookingSource, 'phone' | 'walk_in'>;
  playStart: Date;
  playEnd: Date;
  bufferMinutes: number;
  totalCents: number;
  rateSnapshot: Record<string, unknown>;
};

export type WalkInOutcome = { status: 'created'; bookingId: string } | { status: 'conflict' };

/**
 * Desk bookings skip the hold dance — the customer is standing there. Confirmed directly;
 * the exclusion constraint still arbitrates, so a clash with an online booking landing at
 * the same moment loses cleanly.
 */
export const insertWalkInBooking = async (params: WalkInInsert): Promise<WalkInOutcome> => {
  const bufferMs = params.bufferMinutes * 60_000;

  try {
    const createdId = await withTransaction(async client => {
      const booking = await client.query<{ id: string }>(
        `
        INSERT INTO bookings (venue_id, customer_name, status, source, total_cents, rate_snapshot)
        VALUES ($1, $2, 'confirmed', $3, $4, $5)
        RETURNING id
        `,
        [params.venueId, params.customerName, params.source, params.totalCents, JSON.stringify(params.rateSnapshot)]
      );

      const bookingId = booking.rows[0]?.id;
      if (!bookingId) throw new Error('walk-in booking insert returned no id');

      await client.query(
        `
        INSERT INTO reservations (court_id, booking_id, kind, during, play_during)
        VALUES ($1, $2, 'booking', tstzrange($3, $4), tstzrange($5, $6))
        `,
        [
          params.courtId,
          bookingId,
          new Date(params.playStart.getTime() - bufferMs).toISOString(),
          new Date(params.playEnd.getTime() + bufferMs).toISOString(),
          params.playStart.toISOString(),
          params.playEnd.toISOString(),
        ]
      );

      return bookingId;
    });

    return { status: 'created', bookingId: createdId };
  } catch (error) {
    if (isOverlapViolation(error)) return { status: 'conflict' };
    throw error;
  }
};

export type BlackoutInsert = {
  courtId: string;
  reason: string;
  start: Date;
  end: Date;
};

export const insertBlackout = async (params: BlackoutInsert): Promise<'created' | 'conflict'> => {
  try {
    await query(
      `
      INSERT INTO reservations (court_id, kind, during, play_during, reason)
      VALUES ($1, 'blackout', tstzrange($2, $3), tstzrange($2, $3), $4)
      `,
      [params.courtId, params.start.toISOString(), params.end.toISOString(), params.reason]
    );
    return 'created';
  } catch (error) {
    if (isOverlapViolation(error)) return 'conflict';
    throw error;
  }
};

export type PaymentInsert = {
  bookingId: string;
  venueId: string;
  amountCents: number;
  method: string;
  recordedBy: string;
};

/** Scoped to the venue in SQL: a booking id from another venue simply updates nothing. */
export const insertVenuePayment = async (params: PaymentInsert): Promise<boolean> => {
  const rows = await query<{ id: string }>(
    `
    INSERT INTO payments (booking_id, kind, amount_cents, method, recorded_by)
    SELECT b.id, 'charge', $3, $4, $5
    FROM bookings b
    WHERE b.id = $1 AND b.venue_id = $2
    RETURNING id
    `,
    [params.bookingId, params.venueId, params.amountCents, params.method, params.recordedBy]
  );

  return rows.length > 0;
};
