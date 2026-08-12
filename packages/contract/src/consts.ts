/**
 * The vocabulary both services share. These values cross the wire, so a change here is a
 * change to the API contract — that is exactly why they live in a package neither app owns
 * rather than being duplicated on both sides and drifting.
 */

export const SPORTS = ['pickleball', 'badminton', 'basketball', 'volleyball', 'tennis', 'futsal'] as const;

export const BOOKING_STATUSES = ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'] as const;
export const BOOKING_SOURCES = ['online', 'phone', 'walk_in'] as const;
export const RESERVATION_KINDS = ['booking', 'hold', 'blackout'] as const;
export const RESERVATION_STATES = ['active', 'released'] as const;
export const PAYMENT_KINDS = ['charge', 'refund'] as const;
export const PAYMENT_STATES = ['unpaid', 'partial', 'paid'] as const;
export const PAYMENT_METHODS = ['cash', 'gcash', 'maya', 'card'] as const;
export const WAITLIST_STATES = ['waiting', 'offered', 'claimed', 'expired', 'cancelled'] as const;

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

/**
 * Bounds on booking duration, shared because the API validates against them and the web
 * form must not offer what the API will reject.
 */
export const MIN_BOOKING_MINUTES = 15;
export const MAX_BOOKING_MINUTES = 480;
export const MIN_WAITLIST_MINUTES = 30;
export const MIN_SERIES_WEEKS = 2;
export const MAX_SERIES_WEEKS = 52;

export type Sport = (typeof SPORTS)[number];
export type BookingStatus = (typeof BOOKING_STATUSES)[number];
export type BookingSource = (typeof BOOKING_SOURCES)[number];
export type ReservationKind = (typeof RESERVATION_KINDS)[number];
export type ReservationState = (typeof RESERVATION_STATES)[number];
export type PaymentKind = (typeof PAYMENT_KINDS)[number];
export type PaymentState = (typeof PAYMENT_STATES)[number];
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export type WaitlistState = (typeof WAITLIST_STATES)[number];
