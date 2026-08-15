import type { BookingStatus } from '@courte/contract';

/**
 * Who may review, as a pure function of the booking.
 *
 * Kept out of the service because it is asked in two places that must not disagree: the write
 * endpoint enforces it, and every booking summary reports it so the page knows whether to offer
 * the form. A second copy of these rules is a page that shows a button the API then refuses.
 */

export type ReviewableBooking = {
  status: BookingStatus;
  playEnd: Date;
  hasReview: boolean;
};

export type ReviewRefusal = 'already-reviewed' | 'cancelled' | 'not-played-yet';

/**
 * Null means it may be reviewed. A reason means it may not, and the reason is what the caller
 * turns into a message — "you cannot review this" alone tells a reader nothing about whether
 * to come back later.
 */
export const findReviewRefusal = (booking: ReviewableBooking, now: number): ReviewRefusal | null => {
  if (booking.hasReview) return 'already-reviewed';

  // A cancelled booking was never played, so there is nothing to have an opinion about. A
  // no-show is deliberately still reviewable: the player did not turn up, but the venue may
  // still have handled it well or badly, and that is a fair thing to say.
  if (booking.status === 'cancelled') return 'cancelled';

  // The end, not the start. Reviewing at minute one of a two-hour booking is rating a game
  // that has not happened.
  if (booking.playEnd.getTime() > now) return 'not-played-yet';

  return null;
};

export const canReviewBooking = (booking: ReviewableBooking, now: number): boolean =>
  findReviewRefusal(booking, now) === null;

export const REVIEW_REFUSAL_MESSAGES: Record<ReviewRefusal, string> = {
  'already-reviewed': 'You have already reviewed this booking.',
  cancelled: 'A cancelled booking cannot be reviewed.',
  'not-played-yet': 'You can review this once the booking has finished.',
};
