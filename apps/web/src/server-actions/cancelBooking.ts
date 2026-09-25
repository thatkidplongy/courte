'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { MALFORMED_ID_ERROR } from '@/consts';
import { cancelBooking as cancelRequest } from '@/lib/api';
import { ApiError } from '@/lib/api/client';
import { readFormId } from '@/lib/ids';

export type CancelFormState = {
  error?: string;
};

/**
 * The cancellation window check, the reservation release and the waitlist offers that follow
 * are all one API call now — they were always one transaction, and splitting them across the
 * boundary would have made a half-cancelled booking possible.
 */
export const cancelBooking = async (_previous: CancelFormState, formData: FormData): Promise<CancelFormState> => {
  const session = await auth();
  if (!session?.courteUserId) redirect('/');

  const bookingId = readFormId(formData, 'bookingId');
  if (bookingId === null) return { error: MALFORMED_ID_ERROR };

  try {
    await cancelRequest(session.courteUserId, bookingId);
  } catch (error) {
    if (error instanceof ApiError) return { error: error.toFormMessage() };
    throw error;
  }

  revalidatePath('/bookings');
  redirect('/bookings');
};
