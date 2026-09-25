import 'server-only';

import type {
  Amenity,
  CourtAvailabilityResponse,
  CourtSearchItem,
  CourtSort,
  CourtSurface,
  Paginated,
  Sport,
  VenueScheduleResponse,
} from '@courte/contract';

import { AMENITY_CACHE_SECONDS } from '@/consts';

import { apiFetch } from './client';

/**
 * Every field but `date` is optional, and omitting one means "no filter" rather than a default
 * the caller has to know about. `sport: undefined` is how the marketplace asks for all sports.
 */
export const searchCourts = (params: {
  date: string;
  sport?: Sport;
  surface?: CourtSurface;
  amenities?: string[];
  minRatePerHourCents?: number;
  maxRatePerHourCents?: number;
  sort?: CourtSort;
  time?: string;
  radiusMetres?: number;
  page?: number;
  limit?: number;
}): Promise<Paginated<CourtSearchItem>> => {
  const query = new URLSearchParams({ date: params.date });
  if (params.sport) query.set('sport', params.sport);
  if (params.surface) query.set('surface', params.surface);
  if (params.amenities?.length) query.set('amenities', params.amenities.join(','));
  if (params.minRatePerHourCents) query.set('minRatePerHourCents', String(params.minRatePerHourCents));
  if (params.maxRatePerHourCents) query.set('maxRatePerHourCents', String(params.maxRatePerHourCents));
  if (params.sort) query.set('sort', params.sort);
  if (params.time) query.set('time', params.time);
  if (params.radiusMetres) query.set('radiusMetres', String(params.radiusMetres));
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));

  return apiFetch<Paginated<CourtSearchItem>>(`/courts?${query.toString()}`, { revalidate: 0 });
};

/**
 * The amenity catalogue. The one read on this page that is safe to cache: it is a closed list
 * an owner edits about once, where every other read here is availability, which is the product.
 */
export const fetchAmenities = (): Promise<Amenity[]> =>
  apiFetch<Amenity[]>('/amenities', { revalidate: AMENITY_CACHE_SECONDS });

export const fetchCourtAvailability = (courtId: number, date?: string): Promise<CourtAvailabilityResponse> => {
  const query = date ? `?${new URLSearchParams({ date }).toString()}` : '';
  return apiFetch<CourtAvailabilityResponse>(`/courts/${courtId}${query}`, { revalidate: 0 });
};

/** Every court at the venue this court belongs to, for one day, as the grid the page draws. */
export const fetchVenueSchedule = (courtId: number, date?: string): Promise<VenueScheduleResponse> => {
  const query = date ? `?${new URLSearchParams({ date }).toString()}` : '';
  return apiFetch<VenueScheduleResponse>(`/courts/${courtId}/schedule${query}`, { revalidate: 0 });
};
