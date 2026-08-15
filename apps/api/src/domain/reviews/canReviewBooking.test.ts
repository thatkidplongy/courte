import { describe, expect, it } from 'vitest';

import { canReviewBooking, findReviewRefusal, type ReviewableBooking } from './canReviewBooking';

const NOON = Date.UTC(2026, 7, 15, 12);
const HOUR = 60 * 60_000;

const booking = (overrides: Partial<ReviewableBooking> = {}): ReviewableBooking => ({
  status: 'completed',
  playEnd: new Date(NOON - HOUR),
  hasReview: false,
  ...overrides,
});

describe('findReviewRefusal', () => {
  it('allows a finished booking that has not been reviewed', () => {
    expect(findReviewRefusal(booking(), NOON)).toBeNull();
    expect(canReviewBooking(booking(), NOON)).toBe(true);
  });

  it('refuses one that has already been reviewed', () => {
    expect(findReviewRefusal(booking({ hasReview: true }), NOON)).toBe('already-reviewed');
  });

  it('refuses a cancelled booking, which was never played', () => {
    expect(findReviewRefusal(booking({ status: 'cancelled' }), NOON)).toBe('cancelled');
  });

  /**
   * The player did not turn up, but the venue may still have handled it well or badly. That is
   * a fair thing to have an opinion about, so a no-show is not a refusal.
   */
  it('allows a no-show to be reviewed', () => {
    expect(findReviewRefusal(booking({ status: 'no_show' }), NOON)).toBeNull();
  });

  it('refuses a booking still in the future', () => {
    expect(findReviewRefusal(booking({ playEnd: new Date(NOON + HOUR) }), NOON)).toBe('not-played-yet');
  });

  /** The END of play, not the start — an hour into a two-hour booking is still too early. */
  it('refuses a booking that has started but not finished', () => {
    const inProgress = booking({ status: 'confirmed', playEnd: new Date(NOON + HOUR) });

    expect(findReviewRefusal(inProgress, NOON)).toBe('not-played-yet');
  });

  it('allows one that finished the moment we asked', () => {
    expect(findReviewRefusal(booking({ playEnd: new Date(NOON) }), NOON)).toBeNull();
  });

  /** Already-reviewed is reported ahead of every other reason: it is the one that never changes. */
  it('reports already-reviewed before any other refusal', () => {
    const both = booking({ hasReview: true, status: 'cancelled', playEnd: new Date(NOON + HOUR) });

    expect(findReviewRefusal(both, NOON)).toBe('already-reviewed');
  });
});
