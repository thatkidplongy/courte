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

/**
 * A figure beside the same figure over the preceding window of equal length.
 *
 * `changePercent` is null when there is no meaningful percentage: growth from a zero baseline is
 * not "infinite%", it is "up from nothing", and the screen must say so in words. Both zero is a
 * genuine 0%.
 */
export type Trend = {
  current: number;
  previous: number;
  changePercent: number | null;
  direction: 'up' | 'down' | 'flat';
};

export type VenueDashboardResponse = {
  venueId: number;
  venueName: string;
  venueTimezone: string;
  /** What the caller may do here, so the console shows only the controls their role allows. */
  role: VenueRole;
  stats: {
    bookingsToday: number;
    upcomingWeek: number;
    collectedThisMonthCents: number;
  };
  /** Each headline figure against the window before it. Absent from the stats block above so
   *  a consumer that ignores trends is unaffected. */
  trends: {
    bookingsToday: Trend;
    upcomingWeek: Trend;
    collectedThisMonthCents: Trend;
  };
  /** Money taken per venue-local day over the reporting window. Gap-free: a quiet day is a zero. */
  revenueByDay: Array<{ date: string; collectedCents: number }>;
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

export const markNoShowBodySchema = z.object({
  bookingId: idSchema,
});

export type MarkNoShowBody = z.infer<typeof markNoShowBodySchema>;

/** Who works here. The email is shown to owners only, which is who this endpoint is gated to. */
export type VenueStaffMember = {
  userId: number;
  name: string;
  email: string;
  role: VenueRole;
  /** True for the caller's own row, so the console can stop them removing themselves. */
  isSelf: boolean;
};

/**
 * Staff are added by email, not by user id: an owner knows the address of the person they are
 * hiring and has no way to discover an internal id. The API resolves it, and refuses an address
 * that has never signed in rather than creating a shell account nobody controls.
 */
export const addVenueMemberBodySchema = z.object({
  email: z.email().max(320),
  role: z.enum(VENUE_ROLES),
});

export type AddVenueMemberBody = z.infer<typeof addVenueMemberBodySchema>;
