import { Module } from '@nestjs/common';

import { BookingReviewsController, VenueReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

@Module({
  controllers: [VenueReviewsController, BookingReviewsController],
  providers: [ReviewsService],
})
export class ReviewsModule {}
