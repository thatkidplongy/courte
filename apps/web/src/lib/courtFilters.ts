import {
  AMENITY_SLUG_PATTERN,
  COURT_SORTS,
  COURT_SURFACES,
  MAX_AMENITY_FILTERS,
  PRICE_FILTER_MAX_CENTS,
  PRICE_FILTER_MIN_CENTS,
  SPORTS,
  type CourtSort,
  type CourtSurface,
  type Sport,
} from '@courte/contract';

import { COURT_FILTER_FIELDS, SEARCH_TIME_OPTIONS } from '@/consts';

/**
 * Search params arrive as arbitrary strings — anyone can type `?sport=chess`. These narrow them
 * to the contract's own enums before they reach the API, so a junk value browses as "no filter"
 * rather than bouncing off server-side validation with an error page.
 */

export const isSport = (value: string | undefined): value is Sport => SPORTS.includes(value as Sport);

const isSurface = (value: string | undefined): value is CourtSurface => COURT_SURFACES.includes(value as CourtSurface);

const isSort = (value: string | undefined): value is CourtSort => COURT_SORTS.includes(value as CourtSort);

/**
 * Amenity slugs are database rows, so there is no enum to narrow against here. Malformed ones
 * are dropped and the rest are passed through — an unknown but well-formed slug matches no
 * venue, which is a truthful empty result rather than a silently ignored filter.
 */
const parseAmenities = (value: string | undefined): string[] => {
  if (!value) return [];

  return [
    ...new Set(
      value
        .split(',')
        .map(slug => slug.trim())
        .filter(slug => AMENITY_SLUG_PATTERN.test(slug))
    ),
  ].slice(0, MAX_AMENITY_FILTERS);
};

export type RawCourtFilters = {
  sport?: string;
  date?: string;
  time?: string;
  surface?: string;
  amenities?: string;
  minRatePerHourCents?: string;
  maxRatePerHourCents?: string;
  sort?: string;
  page?: string;
};

export type CourtFilters = {
  sport?: Sport;
  surface?: CourtSurface;
  /** Every slug must be present on the venue. Empty is no filter. */
  amenities: string[];
  minRatePerHourCents?: number;
  maxRatePerHourCents?: number;
  sort: CourtSort;
  dateIso: string;
  /** A wall-clock start like `18:00`, or absent for any time of day. */
  time?: string;
  page: number;
};

/**
 * Only a time the pickers actually offer survives. The filter costs the API a full candidate
 * sweep, so `?time=03:07` — a value no control can produce — is dropped rather than paid for.
 */
const parseTime = (value: string | undefined): string | undefined =>
  value !== undefined && SEARCH_TIME_OPTIONS.includes(value) ? value : undefined;

const parsePage = (value: string | undefined): number => {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
};

/**
 * A rate at either end of the slider's travel is not a filter, it is the absence of one, and
 * sending it would exclude the unpriced courts that "any price" should include.
 */
const parseRate = (value: string | undefined, ignoreWhen: number): number | undefined => {
  const cents = Number(value);
  if (!Number.isInteger(cents) || cents < 0 || cents === ignoreWhen) return undefined;
  return cents;
};

export const parseCourtFilters = (raw: RawCourtFilters, todayIso: string): CourtFilters => ({
  sport: isSport(raw.sport) ? raw.sport : undefined,
  surface: isSurface(raw.surface) ? raw.surface : undefined,
  amenities: parseAmenities(raw.amenities),
  minRatePerHourCents: parseRate(raw.minRatePerHourCents, PRICE_FILTER_MIN_CENTS),
  maxRatePerHourCents: parseRate(raw.maxRatePerHourCents, PRICE_FILTER_MAX_CENTS),
  sort: isSort(raw.sort) ? raw.sort : 'distance',
  dateIso: raw.date ?? todayIso,
  time: parseTime(raw.time),
  page: parsePage(raw.page),
});

/**
 * Rebuilds the marketplace URL, keeping every active filter. Used by the pager, which must
 * change the page and nothing else — a "next" link that quietly dropped the sport filter would
 * return a different result set than the one being paged through.
 */
export const buildCourtsHref = (filters: CourtFilters, overrides: Partial<CourtFilters> = {}): string => {
  const merged = { ...filters, ...overrides };
  const query = new URLSearchParams({ [COURT_FILTER_FIELDS.date]: merged.dateIso });

  if (merged.sport) query.set(COURT_FILTER_FIELDS.sport, merged.sport);
  if (merged.time) query.set(COURT_FILTER_FIELDS.time, merged.time);
  if (merged.surface) query.set(COURT_FILTER_FIELDS.surface, merged.surface);
  if (merged.amenities.length > 0) query.set(COURT_FILTER_FIELDS.amenities, merged.amenities.join(','));
  if (merged.minRatePerHourCents) query.set(COURT_FILTER_FIELDS.minRate, String(merged.minRatePerHourCents));
  if (merged.maxRatePerHourCents) query.set(COURT_FILTER_FIELDS.maxRate, String(merged.maxRatePerHourCents));
  if (merged.sort !== 'distance') query.set(COURT_FILTER_FIELDS.sort, merged.sort);
  if (merged.page > 1) query.set(COURT_FILTER_FIELDS.page, String(merged.page));

  return `/courts?${query.toString()}`;
};

/**
 * Amenities count as one filter however many are ticked. "Clear 4 filters" for one sport plus
 * three amenities overstates how much the reader has narrowed by, and the link clears them
 * all together anyway.
 */
export const countActiveFilters = (filters: CourtFilters): number =>
  [
    filters.sport,
    filters.time,
    filters.surface,
    filters.amenities.length > 0 || undefined,
    filters.minRatePerHourCents,
    filters.maxRatePerHourCents,
  ].filter(Boolean).length;

/**
 * Drops the narrowing filters while keeping the date and the sort. Clearing filters should not
 * silently move the reader to a different day, which is what resetting everything would do.
 */
export const clearCourtFilters = (filters: CourtFilters): CourtFilters => ({
  ...filters,
  sport: undefined,
  time: undefined,
  surface: undefined,
  amenities: [],
  minRatePerHourCents: undefined,
  maxRatePerHourCents: undefined,
  page: 1,
});
