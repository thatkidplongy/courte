'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { ApiError } from '@/lib/api/client';
import { joinWaitlist as joinWaitlistRequest } from '@/lib/api/resources';

export type JoinWaitlistFormState = {
  error?: string;
  ok?: boolean;
};

/**
 * "Tell me if anything opens up between X and Y." The window's coherence — ends after it
 * starts, long enough for the requested minimum — is checked by the API's schema, so the
 * messages the form shows are the API's own.
 */
export const joinWaitlist = async (
  _previous: JoinWaitlistFormState,
  formData: FormData
): Promise<JoinWaitlistFormState> => {
  const session = await auth();
  if (!session?.user) redirect('/');

  try {
    await joinWaitlistRequest(session.user.id, {
      courtId: String(formData.get('courtId') ?? ''),
      desiredStartIso: String(formData.get('desiredStartIso') ?? ''),
      desiredEndIso: String(formData.get('desiredEndIso') ?? ''),
      minDurationMinutes: Number(formData.get('minDurationMinutes')),
    });
  } catch (error) {
    if (error instanceof ApiError) return { error: error.toFormMessage() };
    throw error;
  }

  revalidatePath('/bookings');
  return { ok: true };
};
