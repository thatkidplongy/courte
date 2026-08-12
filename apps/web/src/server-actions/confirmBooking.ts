'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { ApiError } from '@/lib/api/client';
import { confirmBooking as confirmRequest } from '@/lib/api/resources';

export type ConfirmFormState = {
  error?: string;
};

export const confirmBooking = async (_previous: ConfirmFormState, formData: FormData): Promise<ConfirmFormState> => {
  const session = await auth();
  if (!session?.user) redirect('/');

  try {
    await confirmRequest(session.user.id, String(formData.get('bookingId') ?? ''));
  } catch (error) {
    if (error instanceof ApiError) return { error: error.toFormMessage() };
    throw error;
  }

  revalidatePath('/bookings');
  redirect('/bookings');
};
