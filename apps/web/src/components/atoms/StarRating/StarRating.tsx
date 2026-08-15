import type { VenueRating } from '@courte/contract';

import { cn } from '@/lib/utils';

type StarRatingProps = {
  rating: VenueRating;
  className?: string;
};

/**
 * A single filled star, the average to one decimal, and the count. Not five stars with partial
 * fills: at this size the difference between 4.3 and 4.6 is a couple of pixels of one glyph,
 * and the number says it exactly.
 */
const StarIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={cn('inline-block shrink-0', className)} aria-hidden>
    <path d="M12 2.6l2.9 5.9 6.5.95-4.7 4.6 1.1 6.5-5.8-3.05-5.8 3.05 1.1-6.5-4.7-4.6 6.5-.95z" />
  </svg>
);

/**
 * Renders nothing when a venue has no reviews. An unrated venue is not a zero-star venue, and a
 * greyed-out row of stars beside its name reads as one — the honest answer is to say nothing
 * here and let the venue page carry "No reviews yet" where there is room to explain.
 */
export const StarRating = ({ rating, className }: StarRatingProps) => {
  if (rating.average === null || rating.count === 0) return null;

  return (
    <span className={cn('flex items-center gap-1 text-[12.5px] font-semibold', className)}>
      <StarIcon className="text-primary h-3.5 w-3.5" />
      <span>{rating.average.toFixed(1)}</span>
      <span className="text-muted-foreground font-medium">
        ({rating.count} {rating.count === 1 ? 'review' : 'reviews'})
      </span>
    </span>
  );
};
