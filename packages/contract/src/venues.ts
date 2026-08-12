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

export type VenueMembershipSummary = {
  venueId: string;
  venueName: string;
  role: VenueRole;
};

export const dashboardQuerySchema = z.object({
  fromIso: isoDateTimeSchema.optional(),
  toIso: isoDateTimeSchema.optional(),
});

export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;

export type VenueBookingRow = {
  id: string;
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
  venueId: string;
  venueName: string;
  venueTimezone: string;
  stats: {
    bookingsToday: number;
    upcomingWeek: number;
    collectedThisMonthCents: number;
  };
  bookings: VenueBookingRow[];
  courts: Array<{ id: string; name: string }>;
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
  bookingId: string;
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
  bookingId: string;
  method: PaymentMethod;
  amountCents: number;
};
