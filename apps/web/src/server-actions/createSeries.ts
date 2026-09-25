'use server';

import { DateTime } from 'luxon';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { MALFORMED_ID_ERROR } from '@/consts';
import { createSeries as createSeriesRequest } from '@/lib/api';
import { ApiError } from '@/lib/api/client';
import { readFormId } from '@/lib/ids';

export type CreateSeriesFormState = {
  error?: string;
  summary?: {
    created: number;
    requested: number;
    conflicts: string[];
  };
};

/**
 * A partially-booked series is a success: clear weeks book, clashing weeks come back as
 * timestamps. The API returns them as ISO plus the venue's zone and this formats them —
 * a native client would format the same data differently, which is why the API does not.
 */
export const createSeries = async (
  _previous: CreateSeriesFormState,
  formData: FormData
): Promise<CreateSeriesFormState> => {
  const session = await auth();
  if (!session?.courteUserId) redirect('/');

  const courtId = readFormId(formData, 'courtId');
  if (courtId === null) return { error: MALFORMED_ID_ERROR };

  try {
    const result = await createSeriesRequest(session.courteUserId, {
      courtId: courtId,
      startIso: String(formData.get('startIso') ?? ''),
      durationMinutes: Number(formData.get('durationMinutes')),
      weeks: Number(formData.get('weeks')),
    });

    revalidatePath('/bookings');

    return {
      summary: {
        created: result.created,
        requested: result.requested,
        conflicts: result.conflictIsos.map(iso =>
          DateTime.fromISO(iso).setZone(result.timezone).toFormat('ccc d LLL, h:mm a')
        ),
      },
    };
  } catch (error) {
    if (error instanceof ApiError) return { error: error.toFormMessage() };
    throw error;
  }
};
