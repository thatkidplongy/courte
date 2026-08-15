import { z } from 'zod';

import { idSchema, isoDateTimeSchema } from './common';
import {
  MAX_BOOKING_MINUTES,
  MIN_BOOKING_MINUTES,
  PAYMENT_METHODS,
  type BookingSource,
  type BookingStatus,
  type PaymentMethod,
  type PaymentState,
} from './consts';

export const VENUE_ROLES = ['owner', 'staff'] as const;
export type VenueRole = (typeof VENUE_ROLES)[number];

/**
 * One entry in the amenity catalogue. The slug is the stable identifier — it travels in the
 * search URL and is what a venue's rows point at; the label is the only thing ever rendered.
 */
export type Amenity = {
  slug: string;
  label: string;
};

/**
 * `alt` is not optional here for the same reason it is NOT NULL in the database: a photo the
 * reader cannot hear described is a photo half the audience does not get.
 */
export type VenuePhoto = {
  url: string;
  alt: string;
};

export type VenueMembershipSummary = {
  venueId: number;
  venueName: string;
  role: VenueRole;
};

export const dashboardQuerySchema = z.object({
  fromIso: isoDateTimeSchema.optional(),
  toIso: isoDateTimeSchema.optional(),
});

export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;

export type VenueBookingRow = {
  id: number;
  courtName: string;
  customer: string;
  status: BookingStatus;
  source: BookingSource;
  totalCents: number;
  paidCents: number;
  paymentState: PaymentState;
  playStartIso: string;
  playEndIso: string;
};

export type VenueDashboardResponse = {
  venueId: number;
  venueName: string;
  venueTimezone: string;
  stats: {
    bookingsToday: number;
    upcomingWeek: number;
    collectedThisMonthCents: number;
  };
  bookings: VenueBookingRow[];
  courts: Array<{ id: number; name: string }>;
  /**
   * Bookings per venue-local hour over the last 30 days — the shape of the venue's demand.
   * Always 24 entries, hour 0 to 23, so a quiet hour is a visible zero rather than a gap.
   */
  utilisationByHour: Array<{ hour: number; bookings: number }>;
};

export const recordWalkInBodySchema = z.object({
  courtId: idSchema,
  customerName: z.string().trim().min(1, 'Customer name is required').max(120),
  startIso: isoDateTimeSchema,
  durationMinutes: z.coerce.number().int().min(MIN_BOOKING_MINUTES).max(MAX_BOOKING_MINUTES),
  source: z.enum(['walk_in', 'phone']),
});

export type RecordWalkInBody = z.infer<typeof recordWalkInBodySchema>;

export type RecordWalkInResponse = {
  bookingId: number;
  totalCents: number;
};

export const addBlackoutBodySchema = z
  .object({
    courtId: idSchema,
    reason: z.string().trim().min(1, 'A reason is required').max(200),
    startIso: isoDateTimeSchema,
    endIso: isoDateTimeSchema,
  })
  .refine(body => new Date(body.endIso) > new Date(body.startIso), {
    path: ['endIso'],
    message: 'Blackout must end after it starts',
  });

export type AddBlackoutBody = z.infer<typeof addBlackoutBodySchema>;

export const recordPaymentBodySchema = z.object({
  bookingId: idSchema,
  amountPesos: z.coerce.number().positive().max(1_000_000),
  method: z.enum(PAYMENT_METHODS),
});

export type RecordPaymentBody = z.infer<typeof recordPaymentBodySchema>;

export type RecordPaymentResponse = {
  bookingId: number;
  method: PaymentMethod;
  amountCents: number;
};
