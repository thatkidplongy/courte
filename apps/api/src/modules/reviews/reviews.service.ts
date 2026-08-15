import { Injectable } from '@nestjs/common';
import type { CreateReviewBody, Paginated, ReviewSummary } from '@courte/contract';

import { findBookingDetailForUser } from '@/db/repositories/bookingRepository';
import * as reviews from '@/db/repositories/reviewRepository';
import { findVenueSummary } from '@/db/repositories/venueRepository';
import { ConflictError, NotFoundError, ValidationError } from '@/domain/errors';
import { findReviewRefusal, REVIEW_REFUSAL_MESSAGES } from '@/domain/reviews/canReviewBooking';

@Injectable()
export class ReviewsService {
  /**
   * Public, and paginated from the first page — a venue with four hundred reviews must not
   * decide how big this response is.
   *
   * The venue is looked up first so a fabricated id is a 404 rather than an empty list, which
   * would read as "this venue has no reviews".
   */
  async listVenueReviews(venueId: number, page: number, limit: number): Promise<Paginated<ReviewSummary>> {
    const venue = await findVenueSummary(venueId);
    if (!venue) throw new NotFoundError('Venue');

    const { reviews: data, total } = await reviews.findReviewsForVenue(venueId, page, limit);

    return { data, total, page, totalPages: Math.max(1, Math.ceil(total / limit)) };
  }

  /**
   * Ownership is enforced by the lookup, not by a separate check: scoping to the caller means
   * someone else's booking id simply finds nothing and returns the same 404 a made-up id gets.
   * That is what stops a review being written against a stranger's game.
   */
  async createReview(userId: number, bookingId: number, body: CreateReviewBody): Promise<ReviewSummary> {
    const booking = await findBookingDetailForUser(bookingId, userId);
    if (!booking) throw new NotFoundError('Booking');

    const reviewed = await reviews.findReviewedBookingIds([booking.id]);
    const refusal = findReviewRefusal(
      { status: booking.status, playEnd: booking.playEnd, hasReview: reviewed.has(booking.id) },
      Date.now()
    );
    if (refusal) throw new ValidationError(REVIEW_REFUSAL_MESSAGES[refusal]);

    const review = await reviews.insertReview({
      bookingId: booking.id,
      venueId: booking.venueId,
      userId,
      rating: body.rating,
      body: body.body ?? null,
    });

    // The UNIQUE constraint, not the check above, is what settles two submits racing. Null here
    // means the other one committed first — which is a conflict, not a server fault.
    if (!review) throw new ConflictError('You have already reviewed this booking.');

    return review;
  }
}
