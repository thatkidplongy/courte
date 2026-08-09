'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { DateTime } from 'luxon';
import { z } from 'zod';

import { auth } from '@/auth';
import { env } from '@/config/env';
import { findCourtById } from '@/db/repositories/courtRepository';
import { findSeriesById, insertSeries } from '@/db/repositories/seriesRepository';
import { findVenueTimezones } from '@/db/repositories/venueRepository';
import { assertDurationAllowed } from '@/domain/booking/durationPolicy';
import { DomainError, NotFoundError } from '@/domain/errors';
import { materialiseOneSeries } from '@/jobs/extendHorizons';
import { formatDomainError, idSchema, parseInput } from '@/lib/validation';

const createSeriesSchema = z.object({
  courtId: idSchema,
  startIso: z.iso.datetime({ offset: true }),
  durationMinutes: z.coerce.number().int().min(15).max(480),
  weeks: z.coerce.number().int().min(2).max(52),
});

export type CreateSeriesFormState = {
  error?: string;
  summary?: {
    created: number;
    requested: number;
    conflicts: string[];
  };
};

/**
 * "Every week at this time, for N weeks" — the Teams-style recurring booking. No hold dance:
 * occurrences insert one transaction each, clear weeks book, clashing weeks are reported
 * back by date. Same behaviour a series edit in Teams or Google Calendar has, because
 * failing a whole season over one busy week is useless.
 */
export const createSeries = async (
  _previous: CreateSeriesFormState,
  formData: FormData
): Promise<CreateSeriesFormState> => {
  const session = await auth();
  if (!session?.user) redirect('/');

  try {
    const input = parseInput(createSeriesSchema, {
      courtId: formData.get('courtId'),
      startIso: formData.get('startIso'),
      durationMinutes: formData.get('durationMinutes'),
      weeks: formData.get('weeks'),
    });

    const court = await findCourtById(input.courtId);
    if (!court) throw new NotFoundError('Court');
    assertDurationAllowed(court, input.durationMinutes);

    const timezone = (await findVenueTimezones([court.venueId])).get(court.venueId);
    if (!timezone) throw new NotFoundError('Venue');

    const seriesId = await insertSeries({
      createdBy: session.user.id,
      venueId: court.venueId,
      rrule: `FREQ=WEEKLY;COUNT=${input.weeks}`,
      timezone,
      dtstart: new Date(input.startIso),
      durationMinutes: input.durationMinutes,
      source: 'online',
      courtIds: [court.id],
    });

    const series = await findSeriesById(seriesId);
    if (!series) throw new NotFoundError('Series');

    const horizon = new Date(Date.now() + env.RECURRENCE_HORIZON_DAYS * 86_400_000);
    const result = await materialiseOneSeries(series, horizon);

    revalidatePath('/bookings');

    return {
      summary: {
        created: result.created.length,
        requested: input.weeks,
        conflicts: result.conflicts.map(date =>
          DateTime.fromJSDate(date).setZone(timezone).toFormat('ccc d LLL, h:mm a')
        ),
      },
    };
  } catch (error) {
    if (error instanceof DomainError) return { error: formatDomainError(error) };
    throw error;
  }
};
