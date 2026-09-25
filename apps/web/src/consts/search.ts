/**
 * What the marketplace offers as a filter, and how much of a result set a screen shows at once.
 * These change together whenever the search gains a dimension, which is why they sit together.
 */

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

/** Three across on a desktop grid, four rows deep. */
export const MARKETPLACE_PAGE_SIZE = 12;

/**
 * A result row lists this many amenities and then counts the rest. The row's job is to help
 * someone choose between venues, and a full facility inventory on every row is how the price
 * and the times stop being findable.
 */
export const AMENITY_CHIPS_PER_ROW = 3;

/** Days offered on the venue page's day strip, starting today. A working week ahead. */
export const DAY_STRIP_LENGTH = 5;

/** The landing page shows a taste of what is nearby, not the catalogue — one row of five. */
export const HOME_TEASER_SIZE = 5;
