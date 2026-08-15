import { TOP_RATED_MIN_AVERAGE, TOP_RATED_MIN_REVIEWS, type VenueRating } from '@courte/contract';

/**
 * The venue standing every screen renders, from the two numbers the view returns.
 *
 * "Top rated" is derived here rather than stored. A stored flag needs a job to keep it true and
 * is wrong in the window before that job runs — and the window is exactly when it matters, right
 * after a review lands.
 *
 * The review-count floor does the real work. On average alone, one five-star review from the
 * owner's friend outranks a venue with two hundred reviews averaging 4.7.
 */
export const buildVenueRating = (input: { ratingAverage: number | null; reviewCount: number }): VenueRating => ({
  average: input.ratingAverage,
  count: input.reviewCount,
  isTopRated:
    input.ratingAverage !== null &&
    input.ratingAverage >= TOP_RATED_MIN_AVERAGE &&
    input.reviewCount >= TOP_RATED_MIN_REVIEWS,
});
