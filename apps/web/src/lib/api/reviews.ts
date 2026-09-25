import 'server-only';

import type { CreateReviewBody, Paginated, ReviewSummary } from '@courte/contract';

import { apiFetch } from './client';

/** Public: what players said about a venue, newest first. */
export const fetchVenueReviews = (venueId: number, page = 1): Promise<Paginated<ReviewSummary>> =>
  apiFetch<Paginated<ReviewSummary>>(`/venues/${venueId}/reviews?page=${page}`, { revalidate: 0 });

/**
 * Anchored to the booking, not the venue: the API resolves which venue is being rated from the
 * booking the caller owns, so there is no way to review somewhere you never played.
 */
export const createReview = (userId: number, bookingId: number, body: CreateReviewBody): Promise<ReviewSummary> =>
  apiFetch<ReviewSummary>(`/bookings/${bookingId}/reviews`, { method: 'POST', body, userId });
