import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';

import {
  createReviewBodySchema,
  listReviewsQuerySchema,
  type CreateReviewBody,
  type ListReviewsQuery,
  type Paginated,
  type ReviewSummary,
} from '@courte/contract';

import { JwtAuthGuard } from '@/common/auth.guards';
import { CurrentUserId } from '@/common/currentUser.decorator';
import { validateWith } from '@/common/zodValidation.pipe';
import { parseId } from '@/lib/validation';

import { ReviewsService } from './reviews.service';

/** Public reads. Anyone comparing venues can read what players said, signed in or not. */
@Controller('venues/:venueId/reviews')
export class VenueReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get()
  listReviews(
    @Param('venueId') venueId: string,
    @Query(validateWith(listReviewsQuerySchema)) query: ListReviewsQuery
  ): Promise<Paginated<ReviewSummary>> {
    return this.reviews.listVenueReviews(parseId(venueId, 'venueId'), query.page, query.limit);
  }
}

/**
 * Writing is anchored to a booking, not to a venue: the path says which game is being reviewed,
 * and the service resolves the venue from it. A `POST /venues/:id/reviews` would accept a
 * rating from somebody who never played there.
 */
@Controller('bookings/:bookingId/reviews')
@UseGuards(JwtAuthGuard)
export class BookingReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Post()
  createReview(
    @CurrentUserId() userId: number,
    @Param('bookingId') bookingId: string,
    @Body(validateWith(createReviewBodySchema)) body: CreateReviewBody
  ): Promise<ReviewSummary> {
    return this.reviews.createReview(userId, parseId(bookingId, 'bookingId'), body);
  }
}
