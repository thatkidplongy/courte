import type { PoolClient } from 'pg';

import type { BookingSource, BookingStatus, PaymentState } from '@/consts';
import { query } from '@/db/client';

type BookingRow = {
  id: string;
  series_id: string | null;
  user_id: string;
  venue_id: string;
  status: BookingStatus;
  source: BookingSource;
  total_cents: number;
  cancelled_at: string | null;
  created_at: string;
  payment_state: PaymentState;
  paid_cents: number;
};

export type Booking = {
  id: string;
  seriesId: string | null;
  userId: string;
  venueId: string;
  status: BookingStatus;
  source: BookingSource;
  totalCents: number;
  cancelledAt: Date | null;
  createdAt: Date;
  paymentState: PaymentState;
  paidCents: number;
};

const toBooking = (row: BookingRow): Booking => ({
  id: row.id,
  seriesId: row.series_id,
  userId: row.user_id,
  venueId: row.venue_id,
  status: row.status,
  source: row.source,
  totalCents: row.total_cents,
  cancelledAt: row.cancelled_at ? new Date(row.cancelled_at) : null,
  createdAt: new Date(row.created_at),
  paymentState: row.payment_state,
  paidCents: row.paid_cents,
});

const BOOKING_SELECT = `
  SELECT b.id, b.series_id, b.user_id, b.venue_id, b.status, b.source, b.total_cents,
         b.cancelled_at::text AS cancelled_at, b.created_at::text AS created_at,
         ps.payment_state, ps.paid_cents
  FROM bookings b
  JOIN booking_payment_state ps ON ps.booking_id = b.id
`;

export type InsertBookingParams = {
  userId: string;
  venueId: string;
  source: BookingSource;
  totalCents: number;
  rateSnapshot: Record<string, unknown>;
};

export const insertPendingBooking = async (client: PoolClient, params: InsertBookingParams): Promise<string> => {
  const result = await client.query<{ id: string }>(
    `
    INSERT INTO bookings (user_id, venue_id, status, source, total_cents, rate_snapshot)
    VALUES ($1, $2, 'pending', $3, $4, $5)
    RETURNING id
    `,
    [params.userId, params.venueId, params.source, params.totalCents, JSON.stringify(params.rateSnapshot)]
  );

  const id = result.rows[0]?.id;
  if (!id) throw new Error('booking insert returned no id');
  return id;
};

/**
 * Ownership lives in the query, not in a separate check: scoping to user_id means someone
 * else's booking ID simply finds nothing, and the caller returns the same 404 a fabricated
 * ID would get.
 */
export const findBookingForUser = async (bookingId: string, userId: string): Promise<Booking | null> => {
  const rows = await query<BookingRow>(`${BOOKING_SELECT} WHERE b.id = $1 AND b.user_id = $2`, [bookingId, userId]);
  const row = rows[0];
  return row ? toBooking(row) : null;
};

export const findBookingsForUser = async (
  userId: string,
  page: number,
  limit: number
): Promise<{ bookings: Booking[]; total: number }> => {
  const offset = (page - 1) * limit;

  const rows = await query<BookingRow & { total_count: string }>(
    `${BOOKING_SELECT}, COUNT(*) OVER () AS total_count
     WHERE b.user_id = $1
     ORDER BY b.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  return {
    bookings: rows.map(toBooking),
    total: rows.length > 0 ? Number(rows[0]?.total_count ?? 0) : 0,
  };
};

type BookingDetailRow = BookingRow & {
  court_names: string[];
  venue_name: string;
  venue_timezone: string;
  play_start: string;
  play_end: string;
  hold_expires_at: string | null;
};

export type BookingDetail = Booking & {
  courtNames: string[];
  venueName: string;
  venueTimezone: string;
  playStart: Date;
  playEnd: Date;
  holdExpiresAt: Date | null;
};

const toBookingDetail = (row: BookingDetailRow): BookingDetail => ({
  ...toBooking(row),
  courtNames: row.court_names,
  venueName: row.venue_name,
  venueTimezone: row.venue_timezone,
  playStart: new Date(row.play_start),
  playEnd: new Date(row.play_end),
  holdExpiresAt: row.hold_expires_at ? new Date(row.hold_expires_at) : null,
});

const BOOKING_DETAIL_SELECT = `
  SELECT b.id, b.series_id, b.user_id, b.venue_id, b.status, b.source, b.total_cents,
         b.cancelled_at::text AS cancelled_at, b.created_at::text AS created_at,
         ps.payment_state, ps.paid_cents,
         v.name AS venue_name, v.timezone AS venue_timezone,
         array_agg(DISTINCT c.name) AS court_names,
         min(lower(r.play_during))::text AS play_start,
         max(upper(r.play_during))::text AS play_end,
         max(r.expires_at)::text AS hold_expires_at
  FROM bookings b
  JOIN booking_payment_state ps ON ps.booking_id = b.id
  JOIN venues v ON v.id = b.venue_id
  JOIN reservations r ON r.booking_id = b.id
  JOIN courts c ON c.id = r.court_id
`;

export const findBookingDetailForUser = async (bookingId: string, userId: string): Promise<BookingDetail | null> => {
  const rows = await query<BookingDetailRow>(
    `${BOOKING_DETAIL_SELECT}
     WHERE b.id = $1 AND b.user_id = $2
     GROUP BY b.id, ps.payment_state, ps.paid_cents, ps.total_cents, v.name, v.timezone`,
    [bookingId, userId]
  );
  const row = rows[0];
  return row ? toBookingDetail(row) : null;
};

export const findBookingDetailsForUser = async (userId: string, limit: number): Promise<BookingDetail[]> => {
  const rows = await query<BookingDetailRow>(
    `${BOOKING_DETAIL_SELECT}
     WHERE b.user_id = $1 AND r.state = 'active'
     GROUP BY b.id, ps.payment_state, ps.paid_cents, ps.total_cents, v.name, v.timezone
     ORDER BY min(lower(r.play_during)) ASC
     LIMIT $2`,
    [userId, limit]
  );
  return rows.map(toBookingDetail);
};

export const updateBookingStatus = async (
  client: PoolClient,
  bookingId: string,
  status: BookingStatus
): Promise<void> => {
  await client.query(
    `
    UPDATE bookings
    SET status = $2::booking_status,
        cancelled_at = CASE WHEN $2::booking_status = 'cancelled' THEN now() ELSE cancelled_at END
    WHERE id = $1
    `,
    [bookingId, status]
  );
};
