'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { MALFORMED_ID_ERROR } from '@/consts';
import { createReview as createReviewRequest } from '@/lib/api';
import { ApiError } from '@/lib/api/client';
import { readFormId } from '@/lib/ids';

export type ReviewFormState = {
  error?: string;
  ok?: boolean;
};

/**
 * A form adapter, like every other action here. Whether this booking may be reviewed at all —
 * play must have finished, it must not be cancelled, and it must not already carry a review —
 * is decided by the API. Re-deriving it here would be a second copy drifting against the one
 * that actually enforces it.
 */
export const writeReview = async (_previous: ReviewFormState, formData: FormData): Promise<ReviewFormState> => {
  const session = await auth();
  if (!session?.courteUserId) redirect('/');

  const bookingId = readFormId(formData, 'bookingId');
  if (bookingId === null) return { error: MALFORMED_ID_ERROR };

  const rating = Number(formData.get('rating'));
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: 'Choose a rating from 1 to 5.' };

  try {
    await createReviewRequest(session.courteUserId, bookingId, {
      rating,
      // An untouched textarea posts '', which the contract normalises to absent — a review with
      // no words is a real opinion, and storing a blank body would render an empty paragraph.
      body: String(formData.get('body') ?? ''),
    });
  } catch (error) {
    if (error instanceof ApiError) return { error: error.toFormMessage() };
    throw error;
  }

  // Both the list (the form disappears) and the venue page (the review and the new average
  // appear) are stale the moment this lands.
  revalidatePath('/bookings');
  return { ok: true };
};
