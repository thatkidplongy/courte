import type { BookingStatus, CourtSort, CourtSurface, PaymentState, Sport } from '@courte/contract';

import type { BadgeTone } from '@/components/atoms/StatusBadge';

/**
 * How the app says a domain value out loud. Every enum that crosses the wire arrives as a slug,
 * and this is the one place a slug becomes prose — so a new sport or status is a single edit
 * here rather than a hunt through the screens that render it.
 */

export const SPORT_LABELS: Record<Sport, string> = {
  pickleball: 'Pickleball',
  badminton: 'Badminton',
  basketball: 'Basketball',
  volleyball: 'Volleyball',
  tennis: 'Tennis',
  futsal: 'Futsal',
};

export const COURT_SURFACE_LABELS: Record<CourtSurface, string> = {
  indoor: 'Indoor',
  outdoor: 'Outdoor',
  covered: 'Covered',
};

/**
 * Status and payment state, mapped onto the badge's four tones and to prose. `no_show` reads as
 * "No show" rather than the raw enum — the underscore is a database detail.
 */
export const BOOKING_STATUS_TONES: Record<BookingStatus, BadgeTone> = {
  confirmed: 'positive',
  pending: 'warning',
  cancelled: 'neutral',
  completed: 'neutral',
  no_show: 'negative',
};

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  confirmed: 'Confirmed',
  pending: 'Pending',
  cancelled: 'Cancelled',
  completed: 'Completed',
  no_show: 'No show',
};

export const PAYMENT_STATE_TONES: Record<PaymentState, BadgeTone> = {
  unpaid: 'neutral',
  partial: 'warning',
  paid: 'positive',
};

export const PAYMENT_STATE_LABELS: Record<PaymentState, string> = {
  unpaid: 'Unpaid',
  partial: 'Part paid',
  paid: 'Paid',
};

export const COURT_SORT_LABELS: Record<CourtSort, string> = {
  distance: 'Nearest first',
  price: 'Cheapest first',
  rating: 'Best rated first',
};

/** The sort toggle has room for a word, not a sentence — `COURT_SORT_LABELS` is for prose. */
export const COURT_SORT_SHORT_LABELS: Record<CourtSort, string> = {
  distance: 'Nearest',
  price: 'Price',
  rating: 'Rating',
};

/**
 * 0 = Monday, matching `opening_windows.day_of_week` and `price_rules.day_of_week`. The offset
 * is a database fact, so the labels are indexed the database's way rather than JavaScript's —
 * translating in the middle is how an off-by-one gets in.
 */
export const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;

export type Weekday = (typeof WEEKDAYS)[number];

/** Keyed on the literal days rather than `number`, so an index can never come back undefined. */
export const WEEKDAY_LABELS: Record<Weekday, string> = {
  0: 'Monday',
  1: 'Tuesday',
  2: 'Wednesday',
  3: 'Thursday',
  4: 'Friday',
  5: 'Saturday',
  6: 'Sunday',
};

export const BOOKING_PERIOD_LABELS = {
  upcoming: 'Upcoming',
  past: 'Past',
} as const;
