import { z } from 'zod';

import { idSchema, isoDateTimeSchema } from './common';
import { MAX_BOOKING_MINUTES, MIN_WAITLIST_MINUTES, type WaitlistState } from './consts';

export const joinWaitlistBodySchema = z
  .object({
    courtId: idSchema,
    desiredStartIso: isoDateTimeSchema,
    desiredEndIso: isoDateTimeSchema,
    minDurationMinutes: z.coerce.number().int().min(MIN_WAITLIST_MINUTES).max(MAX_BOOKING_MINUTES),
  })
  // Cross-field rules belong in the same schema as the fields, so one parse produces every
  // message the form needs rather than the caller re-checking afterwards.
  .refine(body => new Date(body.desiredEndIso) > new Date(body.desiredStartIso), {
    path: ['desiredEndIso'],
    message: 'The window must end after it starts',
  })
  .refine(
    body =>
      new Date(body.desiredEndIso).getTime() - new Date(body.desiredStartIso).getTime() >=
      body.minDurationMinutes * 60_000,
    { path: ['minDurationMinutes'], message: 'The window is shorter than your minimum duration' }
  );

export type JoinWaitlistBody = z.infer<typeof joinWaitlistBodySchema>;

export type WaitlistEntry = {
  id: string;
  state: WaitlistState;
  desiredStartIso: string;
  desiredEndIso: string;
  courtName: string;
  venueName: string;
  venueTimezone: string;
  offeredCourtId: string | null;
  offeredStartIso: string | null;
  claimExpiresAtIso: string | null;
};
