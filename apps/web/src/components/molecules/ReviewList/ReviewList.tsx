import type { ReviewSummary } from '@courte/contract';

import { formatDay } from '@/lib/format';

type ReviewListProps = {
  reviews: ReviewSummary[];
  timezone: string;
};

const RATING_LABEL = (rating: number): string => `${rating} out of 5`;

/**
 * The stars are drawn as filled and empty glyphs here, unlike `StarRating`, because a single
 * review is a whole opinion rather than a figure to compare — five shapes read faster than a
 * number when there is only one of them. The accessible label still carries the number.
 */
const Stars = ({ rating }: { rating: number }) => (
  <span className="text-primary text-[13px] leading-none tracking-[0.1em]" aria-label={RATING_LABEL(rating)}>
    <span aria-hidden>{'★'.repeat(rating)}</span>
    <span aria-hidden className="text-border">
      {'★'.repeat(5 - rating)}
    </span>
  </span>
);

export const ReviewList = ({ reviews, timezone }: ReviewListProps) => (
  <ul className="divide-border divide-y">
    {reviews.map(review => (
      <li key={review.id} className="py-4 first:pt-0 last:pb-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Stars rating={review.rating} />
          <span className="text-[13px] font-bold">{review.authorName}</span>
          <span className="text-muted-foreground text-[12px] font-medium">
            {formatDay(new Date(review.createdAtIso), timezone)}
          </span>
        </div>
        {review.body ? <p className="mt-2 text-[13.5px] leading-relaxed">{review.body}</p> : null}
      </li>
    ))}
  </ul>
);
