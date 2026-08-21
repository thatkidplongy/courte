import type { BookingStatus, CourtSort, CourtSurface, PaymentState, Sport } from '@courte/contract';

import type { BadgeTone } from '@/components/atoms/StatusBadge';

/**
 * Presentation-only constants. Anything that crosses the wire lives in @courte/contract
 * instead, so the two services cannot disagree about it.
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

/**
 * Bands rather than a free number field. A marketplace filter is a browsing gesture, and a
 * shopper picking "under ₱300" does not want to think in cents.
 */
export const PRICE_BANDS = [
  { cents: 20000, label: 'Under ₱200/hr' },
  { cents: 30000, label: 'Under ₱300/hr' },
  { cents: 45000, label: 'Under ₱450/hr' },
  { cents: 60000, label: 'Under ₱600/hr' },
] as const;

/**
 * The "no filter" option value. Empty string rather than a sentinel word, so an unset filter
 * submits as `sport=` and parses back to undefined without a special case at either end.
 */
export const ANY_FILTER_VALUE = '';

/** Query keys, shared by the filter form and the pager so the two cannot drift apart. */
export const COURT_FILTER_FIELDS = {
  sport: 'sport',
  date: 'date',
  time: 'time',
  surface: 'surface',
  amenities: 'amenities',
  minRate: 'minRatePerHourCents',
  maxRate: 'maxRatePerHourCents',
  sort: 'sort',
  page: 'page',
} as const;

/**
 * The date both policy pages show. Hardcoded rather than derived: it is the day the wording
 * last changed, which no build step can know, and a policy stamped with today's date every
 * time it is deployed tells the reader nothing.
 */
export const LEGAL_UPDATED_ON = '16 August 2026';

/**
 * The page gutter, in one place because the header, the footer and every page must agree — a
 * header whose logo does not sit above the first heading is the sort of drift nobody files.
 *
 * The mockups are drawn on a 1440 canvas with 56px sides, which is what `lg:px-14` reproduces
 * exactly at that width. The cap keeps a very wide monitor from stretching a row of cards to
 * the point where the eye has to travel to read one line.
 */
export const PAGE_GUTTER = 'mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-14';

const SEARCH_TIME_FIRST_MINUTE = 6 * 60;
const SEARCH_TIME_STEP_MINUTES = 30;
const SEARCH_TIME_SLOT_COUNT = 32;

/**
 * The starts the search offers, every half hour from 06:00 to 21:30. Courts here open around
 * six and the last game a venue sells starts before ten, so a wider list would offer times no
 * court in the city can answer. Half-hourly because that is the smallest increment any court
 * books in — offering 18:15 to a court that starts on the hour is offering a guaranteed miss.
 *
 * It is also the allowlist `parseCourtFilters` narrows `?time=` against, so this array is the
 * only set of values the API will ever be asked to sweep for.
 */
export const SEARCH_TIME_OPTIONS: string[] = Array.from({ length: SEARCH_TIME_SLOT_COUNT }, (_, index) => {
  const minutes = SEARCH_TIME_FIRST_MINUTE + index * SEARCH_TIME_STEP_MINUTES;
  const hours = Math.floor(minutes / 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
});

/** The sort toggle has room for a word, not a sentence — `COURT_SORT_LABELS` is for prose. */
export const COURT_SORT_SHORT_LABELS: Record<CourtSort, string> = {
  distance: 'Nearest',
  price: 'Price',
  rating: 'Rating',
};

/** Three across on a desktop grid, four rows deep. */
export const MARKETPLACE_PAGE_SIZE = 12;

/**
 * A result row lists this many amenities and then counts the rest. The row's job is to help
 * someone choose between venues, and a full facility inventory on every row is how the price
 * and the times stop being findable.
 */
export const AMENITY_CHIPS_PER_ROW = 3;

/**
 * An hour. The catalogue is the one read on the search page that is not availability, and a
 * newly added amenity being an hour late is not a booking anyone loses.
 */
export const AMENITY_CACHE_SECONDS = 3600;

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

/**
 * The wire type says `number` because JSON has no narrower one; the database's CHECK constraint
 * says 0–6. The fallback is therefore unreachable, and exists so a bad row surfaces as a visibly
 * wrong label rather than as `undefined` rendered into the page.
 */
export const formatWeekday = (day: number): string => WEEKDAY_LABELS[day as Weekday] ?? `Day ${day}`;

export const BOOKING_PERIOD_LABELS = {
  upcoming: 'Upcoming',
  past: 'Past',
} as const;

/** Days offered on the venue page's day strip, starting today. A working week ahead. */
export const DAY_STRIP_LENGTH = 5;

/** The landing page shows a taste of what is nearby, not the catalogue — one row of five. */
export const HOME_TEASER_SIZE = 5;

/**
 * OpenStreetMap's own tile server. Attribution is a licence condition, not decoration, and it
 * is the same ODbL obligation the venue coordinates already carry.
 */
export const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const OSM_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/** Street level. Used when there is nothing to fit bounds to — one pin, or none. */
export const SINGLE_PIN_ZOOM = 15;

/** How long a caller token is valid. Minutes, not days — it is minted per request anyway. */
export const API_TOKEN_TTL_SECONDS = 300;

/** Give up on the API rather than holding a page render open indefinitely. */
export const API_TIMEOUT_MS = 10_000;

/**
 * What a form says when an id field fails to parse. Every id in a form is hidden or comes from
 * a select this app rendered, so reaching this means the page is stale or the field was
 * tampered with — neither of which the reader can fix by editing what they can see.
 */
export const MALFORMED_ID_ERROR = 'That form is out of date. Reload the page and try again.';
