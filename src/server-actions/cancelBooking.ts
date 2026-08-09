'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { auth } from '@/auth';
import { query, withTransaction } from '@/db/client';
import { isOverlapViolation } from '@/db/errors';
import * as bookings from '@/db/repositories/bookingRepository';
import * as reservations from '@/db/repositories/reservationRepository';
import { cancelBooking as cancelWorkflow } from '@/domain/booking/bookingService';
import { assertCancellable } from '@/domain/booking/cancellationPolicy';
import { DomainError, NotFoundError } from '@/domain/errors';
import { offerReleasedRanges } from '@/jobs/offerReleasedRanges';
import { formatDomainError, idSchema, parseInput } from '@/lib/validation';

const cancelSchema = z.object({ bookingId: idSchema });

export type CancelFormState = {
  error?: string;
};

export const cancelBooking = async (_previous: CancelFormState, formData: FormData): Promise<CancelFormState> => {
  const session = await auth();
  if (!session?.user) redirect('/');

  try {
    const input = parseInput(cancelSchema, { bookingId: formData.get('bookingId') });

    // First play start and the venue's window, scoped to the caller: someone else's booking
    // id finds no row here and surfaces as the same 404 a made-up id would.
    const rows = await query<{ first_play: string; window_minutes: number }>(
      `
      SELECT min(lower(r.play_during))::text AS first_play,
             (EXTRACT(EPOCH FROM v.cancellation_window) / 60)::int AS window_minutes
      FROM bookings b
      JOIN venues v ON v.id = b.venue_id
      JOIN reservations r ON r.booking_id = b.id AND r.state = 'active'
      WHERE b.id = $1 AND b.user_id = $2
      GROUP BY v.cancellation_window
      `,
      [input.bookingId, session.user.id]
    );
    const policy = rows[0];
    if (!policy) throw new NotFoundError('Booking');

    await cancelWorkflow(
      { bookings, reservations, withTransaction, isOverlapViolation },
      {
        bookingId: input.bookingId,
        userId: session.user.id,
        assertInsideCancellationWindow: () =>
          assertCancellable({
            bookingStart: new Date(policy.first_play),
            cancellationWindowMinutes: policy.window_minutes,
            now: new Date(),
            isVenueStaff: false,
          }),
        onReleased: async released => {
          await offerReleasedRanges(released);
        },
      }
    );
  } catch (error) {
    if (error instanceof DomainError) return { error: formatDomainError(error) };
    throw error;
  }

  revalidatePath('/bookings');
  redirect('/bookings');
};
