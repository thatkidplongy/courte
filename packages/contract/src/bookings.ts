import { z } from 'zod';

import { idSchema, isoDateTimeSchema } from './common';
import {
  MAX_BOOKING_MINUTES,
  MIN_BOOKING_MINUTES,
  type BookingSource,
  type BookingStatus,
  type PaymentState,
} from './consts';

export const placeHoldBodySchema = z.object({
  courtId: idSchema,
  startIso: isoDateTimeSchema,
  durationMinutes: z.coerce.number().int().min(MIN_BOOKING_MINUTES).max(MAX_BOOKING_MINUTES),
});

export type PlaceHoldBody = z.infer<typeof placeHoldBodySchema>;

export type PlaceHoldResponse = {
  bookingId: number;
  holdExpiresAtIso: string;
  totalCents: number;
};

export type BookingSummary = {
  id: number;
  seriesId: number | null;
  venueId: number;
  status: BookingStatus;
  source: BookingSource;
  totalCents: number;
  paidCents: number;
  paymentState: PaymentState;
  cancelledAtIso: string | null;
  createdAtIso: string;
  courtNames: string[];
  venueName: string;
  venueTimezone: string;
  playStartIso: string;
  playEndIso: string;
  holdExpiresAtIso: string | null;
  /**
   * Whether this booking has already been reviewed, and whether it may be. Both are decided by
   * the API rather than the page: the rules are that play must have finished and the booking
   * must not have been cancelled, and a page that re-derived them from `playEndIso` would be a
   * second copy drifting against the one the write endpoint actually enforces.
   */
  hasReview: boolean;
  canReview: boolean;
};

export const listBookingsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type ListBookingsQuery = z.infer<typeof listBookingsQuerySchema>;
