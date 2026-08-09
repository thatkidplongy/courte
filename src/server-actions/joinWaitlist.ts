'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { auth } from '@/auth';
import { findCourtById } from '@/db/repositories/courtRepository';
import { insertWaitlistEntry } from '@/db/repositories/waitlistRepository';
import { DomainError, NotFoundError, ValidationError } from '@/domain/errors';
import { formatDomainError, idSchema, parseInput } from '@/lib/validation';

const joinWaitlistSchema = z.object({
  courtId: idSchema,
  desiredStartIso: z.iso.datetime({ offset: true }),
  desiredEndIso: z.iso.datetime({ offset: true }),
  minDurationMinutes: z.coerce.number().int().min(30).max(480),
});

export type JoinWaitlistFormState = {
  error?: string;
  ok?: boolean;
};

/**
 * "Tell me if anything opens up between X and Y." The sweep and cancellation paths offer
 * released ranges to the oldest matching entry; the offer lands in My bookings with a
 * claim window.
 */
export const joinWaitlist = async (
  _previous: JoinWaitlistFormState,
  formData: FormData
): Promise<JoinWaitlistFormState> => {
  const session = await auth();
  if (!session?.user) redirect('/');

  try {
    const input = parseInput(joinWaitlistSchema, {
      courtId: formData.get('courtId'),
      desiredStartIso: formData.get('desiredStartIso'),
      desiredEndIso: formData.get('desiredEndIso'),
      minDurationMinutes: formData.get('minDurationMinutes'),
    });

    const desiredStart = new Date(input.desiredStartIso);
    const desiredEnd = new Date(input.desiredEndIso);

    if (desiredEnd <= desiredStart) throw new ValidationError('The window must end after it starts');
    if (desiredEnd.getTime() - desiredStart.getTime() < input.minDurationMinutes * 60_000) {
      throw new ValidationError('The window is shorter than your minimum duration');
    }

    const court = await findCourtById(input.courtId);
    if (!court) throw new NotFoundError('Court');

    await insertWaitlistEntry({
      userId: session.user.id,
      courtId: court.id,
      desiredStart,
      desiredEnd,
      minDurationMinutes: input.minDurationMinutes,
    });
  } catch (error) {
    if (error instanceof DomainError) return { error: formatDomainError(error) };
    throw error;
  }

  revalidatePath('/bookings');
  return { ok: true };
};
