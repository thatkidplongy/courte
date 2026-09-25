'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { MALFORMED_ID_ERROR } from '@/consts';
import { confirmBooking as confirmRequest } from '@/lib/api';
import { ApiError } from '@/lib/api/client';
import { readFormId } from '@/lib/ids';

export type ConfirmFormState = {
  error?: string;
};

export const confirmBooking = async (_previous: ConfirmFormState, formData: FormData): Promise<ConfirmFormState> => {
  const session = await auth();
  if (!session?.courteUserId) redirect('/');

  const bookingId = readFormId(formData, 'bookingId');
  if (bookingId === null) return { error: MALFORMED_ID_ERROR };

  try {
    await confirmRequest(session.courteUserId, bookingId);
  } catch (error) {
    if (error instanceof ApiError) return { error: error.toFormMessage() };
    throw error;
  }

  revalidatePath('/bookings');
  redirect('/bookings');
};
