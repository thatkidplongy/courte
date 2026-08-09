'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { auth } from '@/auth';
import { withTransaction } from '@/db/client';
import { isOverlapViolation } from '@/db/errors';
import * as bookings from '@/db/repositories/bookingRepository';
import * as reservations from '@/db/repositories/reservationRepository';
import { confirmBooking as confirmWorkflow } from '@/domain/booking/bookingService';
import { DomainError } from '@/domain/errors';
import { formatDomainError, idSchema, parseInput } from '@/lib/validation';

const confirmSchema = z.object({ bookingId: idSchema });

export type ConfirmFormState = {
  error?: string;
};

export const confirmBooking = async (_previous: ConfirmFormState, formData: FormData): Promise<ConfirmFormState> => {
  const session = await auth();
  if (!session?.user) redirect('/');

  try {
    const input = parseInput(confirmSchema, { bookingId: formData.get('bookingId') });

    await confirmWorkflow(
      { bookings, reservations, withTransaction, isOverlapViolation },
      { bookingId: input.bookingId, userId: session.user.id }
    );
  } catch (error) {
    if (error instanceof DomainError) return { error: formatDomainError(error) };
    throw error;
  }

  revalidatePath('/bookings');
  redirect('/bookings');
};
