'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';

import { auth } from '@/auth';
import { env } from '@/config/env';
import { withTransaction } from '@/db/client';
import { isOverlapViolation } from '@/db/errors';
import * as bookings from '@/db/repositories/bookingRepository';
import { findCourtById } from '@/db/repositories/courtRepository';
import { findPriceRulesForCourts } from '@/db/repositories/priceRuleRepository';
import * as reservations from '@/db/repositories/reservationRepository';
import { findVenueTimezones } from '@/db/repositories/venueRepository';
import { doesSlotFit } from '@/domain/availability/getAvailability';
import { placeHold as placeHoldWorkflow } from '@/domain/booking/bookingService';
import { assertDurationAllowed } from '@/domain/booking/durationPolicy';
import { DomainError, NotFoundError, OutsideOpeningHoursError } from '@/domain/errors';
import { resolveQuote } from '@/domain/pricing/resolveQuote';
import { formatDomainError, idSchema, parseInput } from '@/lib/validation';
import { getAvailabilityForCourts } from '@/services/availabilityService';

const placeHoldSchema = z.object({
  courtId: idSchema,
  startIso: z.iso.datetime({ offset: true }),
  durationMinutes: z.coerce.number().int().min(15).max(480),
});

export type PlaceHoldFormState = {
  error?: string;
};

/**
 * The checkout entry point: validates, checks opening hours, quotes, and asks the booking
 * workflow for a hold. Deliberately no availability pre-check for *conflicts* — the
 * exclusion constraint arbitrates races (docs/adr/0002); the opening-hours check here is
 * about hours, which change by owner edit, not by race.
 */
export const placeHold = async (_previous: PlaceHoldFormState, formData: FormData): Promise<PlaceHoldFormState> => {
  const session = await auth();
  if (!session?.user) redirect('/');

  let bookingId: string;

  try {
    const input = parseInput(placeHoldSchema, {
      courtId: formData.get('courtId'),
      startIso: formData.get('startIso'),
      durationMinutes: formData.get('durationMinutes'),
    });

    const court = await findCourtById(input.courtId);
    if (!court) throw new NotFoundError('Court');

    assertDurationAllowed(court, input.durationMinutes);

    const start = new Date(input.startIso);
    const end = new Date(start.getTime() + input.durationMinutes * 60_000);
    const requested = { start: start.getTime(), end: end.getTime() };

    const availability = await getAvailabilityForCourts([court], requested);
    const courtAvailability = availability.get(court.id);
    if (!courtAvailability || !doesSlotFit({ availability: courtAvailability, requested })) {
      throw new OutsideOpeningHoursError('That time is not available on this court');
    }

    const [rules, timezones] = await Promise.all([
      findPriceRulesForCourts([court.id]),
      findVenueTimezones([court.venueId]),
    ]);
    const timezone = timezones.get(court.venueId);
    if (!timezone) throw new NotFoundError('Venue');

    const quote = resolveQuote({ rules, requested, timezone, isMember: false });

    const result = await placeHoldWorkflow(
      { bookings, reservations, withTransaction, isOverlapViolation },
      {
        userId: session.user.id,
        court: { id: court.id, venueId: court.venueId, bufferMinutes: court.bufferMinutes },
        slots: [{ courtId: court.id, start, end }],
        quote,
        source: 'online',
        holdTtlMinutes: env.HOLD_TTL_MINUTES,
        now: new Date(),
      }
    );

    bookingId = result.bookingId;
  } catch (error) {
    if (error instanceof DomainError) return { error: formatDomainError(error) };
    throw error;
  }

  // redirect throws internally; it must live outside the try or the catch would swallow it.
  redirect(`/checkout/${bookingId}`);
};
