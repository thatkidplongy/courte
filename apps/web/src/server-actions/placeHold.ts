'use server';

import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { ApiError } from '@/lib/api/client';
import { placeHold as placeHoldRequest } from '@/lib/api/resources';

export type PlaceHoldFormState = {
  error?: string;
};

/**
 * A form adapter, nothing more: read the form, ask the API, turn a rejection into a message
 * the form can render. Every rule about durations, opening hours, pricing and who wins a
 * race lives in @courte/api — validation here would only be a second, drifting copy.
 */
export const placeHold = async (_previous: PlaceHoldFormState, formData: FormData): Promise<PlaceHoldFormState> => {
  const session = await auth();
  if (!session?.user) redirect('/');

  let bookingId: string;

  try {
    const result = await placeHoldRequest(session.user.id, {
      courtId: String(formData.get('courtId') ?? ''),
      startIso: String(formData.get('startIso') ?? ''),
      durationMinutes: Number(formData.get('durationMinutes')),
    });
    bookingId = result.bookingId;
  } catch (error) {
    if (error instanceof ApiError) return { error: error.toFormMessage() };
    throw error;
  }

  // redirect throws internally; it must live outside the try or the catch would swallow it.
  redirect(`/checkout/${bookingId}`);
};
