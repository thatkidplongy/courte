import type { ReviewSummary } from '@courte/contract';

import { query } from '@/db/client';

/**
 * Reviews and the venue standing derived from them. The aggregate is a view, so nothing here
 * maintains a counter that could disagree with the rows.
 */

type ReviewRow = {
  id: number;
  rating: number;
  body: string | null;
  author_name: string;
  created_at: string;
};

/**
 * A reviewer is identified by their first name, or by the local part of their email when they
 * have no name. Never the full address — a review page is public, and publishing the email of
 * everyone who booked is a data leak dressed up as attribution.
 */
const AUTHOR_NAME = `COALESCE(NULLIF(split_part(u.name, ' ', 1), ''), split_part(u.email::text, '@', 1))`;

const toReview = (row: ReviewRow): ReviewSummary => ({
  id: row.id,
  rating: row.rating,
  body: row.body,
  authorName: row.author_name,
  createdAtIso: new Date(row.created_at).toISOString(),
});

export const findReviewsForVenue = async (
  venueId: number,
  page: number,
  limit: number
): Promise<{ reviews: ReviewSummary[]; total: number }> => {
  const offset = (page - 1) * limit;

  const rows = await query<ReviewRow & { total_count: string }>(
    `
    SELECT r.id, r.rating, r.body, ${AUTHOR_NAME} AS author_name,
           r.created_at::text AS created_at, COUNT(*) OVER () AS total_count
    FROM "Review" r
    JOIN "User" u ON u.id = r.user_id
    WHERE r.venue_id = $1 AND r.deleted_at IS NULL
    ORDER BY r.created_at DESC, r.id DESC
    LIMIT $2 OFFSET $3
    `,
    [venueId, limit, offset]
  );

  return {
    reviews: rows.map(toReview),
    total: rows.length > 0 ? Number(rows[0]?.total_count ?? 0) : 0,
  };
};

/** The newest few for the venue page, without the count a paginated list would also fetch. */
export const findRecentReviewsForVenue = async (venueId: number, limit: number): Promise<ReviewSummary[]> => {
  const rows = await query<ReviewRow>(
    `
    SELECT r.id, r.rating, r.body, ${AUTHOR_NAME} AS author_name, r.created_at::text AS created_at
    FROM "Review" r
    JOIN "User" u ON u.id = r.user_id
    WHERE r.venue_id = $1 AND r.deleted_at IS NULL
    ORDER BY r.created_at DESC, r.id DESC
    LIMIT $2
    `,
    [venueId, limit]
  );

  return rows.map(toReview);
};

export type RatingRow = {
  reviewCount: number;
  ratingAverage: number | null;
};

export const findVenueRating = async (venueId: number): Promise<RatingRow> => {
  const rows = await query<{ review_count: number; rating_avg: string | null }>(
    'SELECT review_count, rating_avg FROM "VenueRating" WHERE venue_id = $1',
    [venueId]
  );

  const row = rows[0];
  return {
    reviewCount: row?.review_count ?? 0,
    // numeric comes back as a string; a venue with no reviews has no average at all.
    ratingAverage: row?.rating_avg == null ? null : Number(row.rating_avg),
  };
};

/**
 * Which of a caller's bookings already carry a review. One query for a whole page of bookings
 * rather than one per row — the same N+1 rule as everywhere else.
 */
export const findReviewedBookingIds = async (bookingIds: number[]): Promise<Set<number>> => {
  if (bookingIds.length === 0) return new Set();

  const rows = await query<{ booking_id: number }>(
    'SELECT booking_id FROM "Review" WHERE booking_id = ANY($1::bigint[]) AND deleted_at IS NULL',
    [bookingIds]
  );

  return new Set(rows.map(row => row.booking_id));
};

export type InsertReviewParams = {
  bookingId: number;
  venueId: number;
  userId: number;
  rating: number;
  body: string | null;
};

/**
 * The UNIQUE on booking_id is the arbiter, not a prior SELECT: two submits of the same form
 * race, and check-then-insert loses that race exactly as it does for bookings. A conflict means
 * the review already exists, which the service turns into a 409 rather than an opaque 500.
 */
export const insertReview = async (params: InsertReviewParams): Promise<ReviewSummary | null> => {
  const rows = await query<ReviewRow>(
    `
    WITH inserted AS (
      INSERT INTO "Review" (booking_id, venue_id, user_id, rating, body)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (booking_id) DO NOTHING
      RETURNING id, rating, body, user_id, created_at
    )
    SELECT i.id, i.rating, i.body, ${AUTHOR_NAME} AS author_name, i.created_at::text AS created_at
    FROM inserted i
    JOIN "User" u ON u.id = i.user_id
    `,
    [params.bookingId, params.venueId, params.userId, params.rating, params.body]
  );

  const row = rows[0];
  return row ? toReview(row) : null;
};
