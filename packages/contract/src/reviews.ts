import { z } from 'zod';

import { MAX_REVIEW_BODY_LENGTH, MAX_REVIEW_RATING, MIN_REVIEW_RATING } from './consts';

/**
 * A venue's standing, as every screen that shows a rating needs it.
 *
 * `average` is null rather than 0 for a venue nobody has reviewed. Zero is a rating — the worst
 * one — and a venue that has simply not been rated yet has not earned it. Every consumer has to
 * handle the null, which is the point: it forces the "No reviews yet" case to be written rather
 * than rendered as a row of empty stars.
 */
export type VenueRating = {
  average: number | null;
  count: number;
  /** Derived from the thresholds in consts, never stored. */
  isTopRated: boolean;
};

export type ReviewSummary = {
  id: number;
  rating: number;
  body: string | null;
  /** First name or the part of the email before the @ — never the full address. */
  authorName: string;
  createdAtIso: string;
};

export const listReviewsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
});

export type ListReviewsQuery = z.infer<typeof listReviewsQuerySchema>;

/**
 * The booking is named by the path, not the body — a review is written against a booking the
 * caller owns, and accepting the id here would invite sending someone else's.
 */
export const createReviewBodySchema = z.object({
  rating: z.coerce.number().int().min(MIN_REVIEW_RATING).max(MAX_REVIEW_RATING),
  /**
   * Optional, and blank is normalised to absent rather than stored as an empty string — the
   * database rejects a blank body, and a form that submits an untouched textarea sends ''.
   */
  body: z
    .string()
    .trim()
    .max(MAX_REVIEW_BODY_LENGTH)
    .transform(value => (value === '' ? null : value))
    .nullable()
    .optional(),
});

export type CreateReviewBody = z.infer<typeof createReviewBodySchema>;
