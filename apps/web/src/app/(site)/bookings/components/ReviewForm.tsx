'use client';

import { useActionState, useState } from 'react';

import { MAX_REVIEW_BODY_LENGTH, MAX_REVIEW_RATING, MIN_REVIEW_RATING } from '@courte/contract';

import { FieldLabel } from '@/components/atoms/FieldLabel';
import { Notice } from '@/components/atoms/Notice';
import { Button } from '@/components/shadcn/ui/button';
import { cn } from '@/lib/utils';
import type { ReviewFormState } from '@/server-actions/writeReview';

type ReviewFormProps = {
  bookingId: number;
  venueName: string;
  action: (state: ReviewFormState, formData: FormData) => Promise<ReviewFormState>;
};

const RATINGS = Array.from(
  { length: MAX_REVIEW_RATING - MIN_REVIEW_RATING + 1 },
  (_, index) => MIN_REVIEW_RATING + index
);

/**
 * Radio buttons drawn as stars, not a `<select>` of numbers.
 *
 * They are real radios with a visually-hidden input, so the group is keyboard-navigable with
 * the arrow keys and announces itself as "3 out of 5" — a row of clickable spans would be
 * neither. The label is on the input, which is why each star is inside its own `<label>`.
 */
const StarPicker = ({ value, onChange }: { value: number; onChange: (rating: number) => void }) => (
  <fieldset className="mt-2">
    <legend className="sr-only">Rating</legend>
    <div className="flex items-center gap-1">
      {RATINGS.map(rating => (
        <label key={rating} className="cursor-pointer">
          <input
            type="radio"
            name="rating"
            value={rating}
            checked={value === rating}
            onChange={() => onChange(rating)}
            className="sr-only"
          />
          <span
            aria-label={`${rating} out of 5`}
            className={cn(
              'block text-[22px] leading-none transition',
              rating <= value ? 'text-primary' : 'text-border hover:text-primary/50'
            )}
          >
            ★
          </span>
        </label>
      ))}
    </div>
  </fieldset>
);

export const ReviewForm = ({ bookingId, venueName, action }: ReviewFormProps) => {
  const [state, formAction, isPending] = useActionState(action, {});
  const [rating, setRating] = useState(0);

  if (state.ok) return <Notice tone="success">Thanks — your review is live.</Notice>;

  return (
    <form action={formAction} className="border-border mt-4 rounded-md border p-4">
      <input type="hidden" name="bookingId" value={bookingId} />

      <FieldLabel>How was {venueName}?</FieldLabel>
      <StarPicker value={rating} onChange={setRating} />

      <textarea
        name="body"
        rows={3}
        maxLength={MAX_REVIEW_BODY_LENGTH}
        placeholder="Anything worth telling the next player? (optional)"
        className="border-border focus:border-primary mt-3 w-full rounded-md border px-3 py-2 text-[13.5px] outline-none transition"
      />

      <div className="mt-3 flex items-center gap-3">
        {/* Disabled until a star is picked: the rating is the one required field, and letting
            the form post a 0 only to bounce back an error wastes the reader's time. */}
        <Button type="submit" disabled={isPending || rating === 0}>
          {isPending ? 'Posting…' : 'Post review'}
        </Button>
        {rating === 0 ? <span className="text-muted-foreground text-xs font-medium">Pick a rating first</span> : null}
      </div>

      {state.error ? (
        <p role="alert" className="text-destructive mt-2 text-xs font-medium">
          {state.error}
        </p>
      ) : null}
    </form>
  );
};
