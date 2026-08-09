export const SPORTS = ['pickleball', 'badminton', 'basketball', 'volleyball', 'tennis', 'futsal'] as const;

export const BOOKING_STATUSES = ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'] as const;
export const BOOKING_SOURCES = ['online', 'phone', 'walk_in'] as const;
export const RESERVATION_KINDS = ['booking', 'hold', 'blackout'] as const;
export const RESERVATION_STATES = ['active', 'released'] as const;
export const PAYMENT_KINDS = ['charge', 'refund'] as const;
export const PAYMENT_STATES = ['unpaid', 'partial', 'paid'] as const;
export const WAITLIST_STATES = ['waiting', 'offered', 'claimed', 'expired', 'cancelled'] as const;

/**
 * Postgres raises this SQLSTATE when the reservations exclusion constraint rejects an
 * overlapping range. It is the sole signal that a slot was taken between render and submit —
 * see docs/adr/0002.
 */
export const PG_EXCLUSION_VIOLATION = '23P01';
export const PG_UNIQUE_VIOLATION = '23505';
export const PG_FOREIGN_KEY_VIOLATION = '23503';

/**
 * `opening_windows.day_of_week` is 0 = Monday so that a week reads left to right in the
 * dashboard. Luxon's `weekday` is 1 = Monday, so every conversion goes through these rather
 * than an inline `- 1` scattered across the codebase.
 */
export const MONDAY_INDEX = 0;
export const DAYS_PER_WEEK = 7;
export const MINUTES_PER_DAY = 1440;
export const MINUTES_PER_WEEK = MINUTES_PER_DAY * DAYS_PER_WEEK;

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;
export const DEFAULT_SORT_ORDER = 'desc' as const;

export const DEFAULT_SEARCH_RADIUS_METRES = 10_000;
export const MAX_SEARCH_RADIUS_METRES = 50_000;

/**
 * v1 launches in one market. Search origin and display timezone default to Quezon City;
 * geolocation replaces the origin in a later slice, and each venue still renders its own
 * local times from venues.timezone.
 */
export const SEARCH_DEFAULTS = {
  latitude: 14.676,
  longitude: 121.0437,
  timezone: 'Asia/Manila',
} as const;

export const SLOT_CHIPS_PER_CARD = 3;

export type Sport = (typeof SPORTS)[number];
export type BookingStatus = (typeof BOOKING_STATUSES)[number];
export type BookingSource = (typeof BOOKING_SOURCES)[number];
export type ReservationKind = (typeof RESERVATION_KINDS)[number];
export type ReservationState = (typeof RESERVATION_STATES)[number];
export type PaymentKind = (typeof PAYMENT_KINDS)[number];
export type PaymentState = (typeof PAYMENT_STATES)[number];
export type WaitlistState = (typeof WAITLIST_STATES)[number];
