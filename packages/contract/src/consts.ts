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
 * Wide enough to reach the mountain barangays — Cebu City runs about 14 km north from Fuente
 * Osmeña. The marketplace passes this so "every court in the city" is literally true, rather
 * than the 10 km a proximity search defaults to.
 */
export const CITY_SEARCH_RADIUS_METRES = 20_000;

/**
 * How a court is enclosed. `covered` is roofed but open at the sides — the case a boolean
 * could not carry, and the one that decides whether a game survives an afternoon shower.
 */
export const COURT_SURFACES = ['indoor', 'outdoor', 'covered'] as const;

/**
 * Amenity slugs are rows in the database, not a closed enum, so the contract validates their
 * shape rather than their membership. A well-formed slug nobody offers matches no venue,
 * which is the honest answer to "show me the courts with a helipad".
 */
export const AMENITY_SLUG_PATTERN = /^[a-z][a-z0-9_]*$/;

/** A ceiling on the filter, so a hand-written URL cannot ask for a thousand-way intersection. */
export const MAX_AMENITY_FILTERS = 20;

/** Marketplace orderings. Both are decided in SQL so paging stays consistent across pages. */
export const COURT_SORTS = ['distance', 'price'] as const;

/**
 * The bounds of the price filter, in cents. Shared rather than presentational: the slider's
 * ends and the query's accepted range have to be the same numbers, or dragging to the far
 * right would exclude courts the API would happily have returned.
 *
 * The maximum is the "no upper limit" position — a filter pinned to the top is dropped from
 * the query rather than sent as a ceiling, so a court priced above it still appears.
 */
export const PRICE_FILTER_MIN_CENTS = 0;
export const PRICE_FILTER_MAX_CENTS = 150_000;
export const PRICE_FILTER_STEP_CENTS = 5_000;

/**
 * v1 launches in one market. The search origin is Fuente Osmeña Circle, Cebu City —
 * deliberately a landmark rather than a venue, so no result ever reports a distance of zero.
 * Geolocation replaces the origin in a later slice, and each venue still renders its own
 * local times from venues.timezone.
 */
export const SEARCH_DEFAULTS = {
  latitude: 10.3103,
  longitude: 123.8917,
  timezone: 'Asia/Manila',
  label: 'Cebu City',
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
export type CourtSurface = (typeof COURT_SURFACES)[number];
export type CourtSort = (typeof COURT_SORTS)[number];
