import 'server-only';

import type {
  AddBlackoutBody,
  Amenity,
  BookingSummary,
  CourtAvailabilityResponse,
  CourtPricingResponse,
  CourtSearchItem,
  CourtSort,
  CourtSurface,
  CreateSeriesBody,
  CreateSeriesResponse,
  JoinWaitlistBody,
  OpeningWindowSummary,
  OwnedCourt,
  Paginated,
  PlaceHoldBody,
  PlaceHoldResponse,
  PriceRuleSummary,
  RecordPaymentBody,
  RecordPaymentResponse,
  RecordWalkInBody,
  RecordWalkInResponse,
  ReplaceOpeningWindowsBody,
  Sport,
  UpsertCourtBody,
  UpsertIdentityResponse,
  UpsertPriceRuleBody,
  VenueDashboardResponse,
  VenueMembershipSummary,
  VenueScheduleResponse,
  WaitlistEntry,
} from '@courte/contract';

import { AMENITY_CACHE_SECONDS } from '@/consts';

import { apiFetch } from './client';

/**
 * One function per endpoint, named for what the page is asking rather than for the verb and
 * path. Pages import these; nothing else in the app constructs a URL.
 *
 * Reads pass `revalidate: 0` throughout — availability is the product, and a cached chip that
 * has already been booked is worse than a slower page.
 */

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

export const fetchCourtAvailability = (courtId: string, date?: string): Promise<CourtAvailabilityResponse> => {
  const query = date ? `?${new URLSearchParams({ date }).toString()}` : '';
  return apiFetch<CourtAvailabilityResponse>(`/courts/${courtId}${query}`, { revalidate: 0 });
};

/** Every court at the venue this court belongs to, for one day, as the grid the page draws. */
export const fetchVenueSchedule = (courtId: string, date?: string): Promise<VenueScheduleResponse> => {
  const query = date ? `?${new URLSearchParams({ date }).toString()}` : '';
  return apiFetch<VenueScheduleResponse>(`/courts/${courtId}/schedule${query}`, { revalidate: 0 });
};

export const placeHold = (userId: string, body: PlaceHoldBody): Promise<PlaceHoldResponse> =>
  apiFetch<PlaceHoldResponse>('/holds', { method: 'POST', body, userId });

export const fetchBooking = (userId: string, bookingId: string): Promise<BookingSummary> =>
  apiFetch<BookingSummary>(`/bookings/${bookingId}`, { userId, revalidate: 0 });

export const fetchBookings = (userId: string): Promise<Paginated<BookingSummary>> =>
  apiFetch<Paginated<BookingSummary>>('/bookings', { userId, revalidate: 0 });

export const confirmBooking = (userId: string, bookingId: string): Promise<void> =>
  apiFetch<void>(`/bookings/${bookingId}/confirm`, { method: 'POST', userId });

export const cancelBooking = (userId: string, bookingId: string): Promise<void> =>
  apiFetch<void>(`/bookings/${bookingId}/cancel`, { method: 'POST', userId });

export const createSeries = (userId: string, body: CreateSeriesBody): Promise<CreateSeriesResponse> =>
  apiFetch<CreateSeriesResponse>('/series', { method: 'POST', body, userId });

export const joinWaitlist = (userId: string, body: JoinWaitlistBody): Promise<{ entryId: string }> =>
  apiFetch<{ entryId: string }>('/waitlist-entries', { method: 'POST', body, userId });

export const fetchWaitlistEntries = (userId: string): Promise<WaitlistEntry[]> =>
  apiFetch<WaitlistEntry[]>('/waitlist-entries', { userId, revalidate: 0 });

export const fetchVenueMemberships = (userId: string): Promise<VenueMembershipSummary[]> =>
  apiFetch<VenueMembershipSummary[]>('/venues/memberships', { userId, revalidate: 0 });

export const fetchVenueDashboard = (userId: string, venueId: string): Promise<VenueDashboardResponse> =>
  apiFetch<VenueDashboardResponse>(`/venues/${venueId}/dashboard`, { userId, revalidate: 0 });

export const recordWalkIn = (userId: string, venueId: string, body: RecordWalkInBody): Promise<RecordWalkInResponse> =>
  apiFetch<RecordWalkInResponse>(`/venues/${venueId}/walk-ins`, { method: 'POST', body, userId });

export const addBlackout = (userId: string, venueId: string, body: AddBlackoutBody): Promise<void> =>
  apiFetch<void>(`/venues/${venueId}/blackouts`, { method: 'POST', body, userId });

export const recordPayment = (
  userId: string,
  venueId: string,
  body: RecordPaymentBody
): Promise<RecordPaymentResponse> =>
  apiFetch<RecordPaymentResponse>(`/venues/${venueId}/payments`, { method: 'POST', body, userId });

/**
 * Owner-side inventory. Every path is nested under the venue, because that is what the API
 * authorises against — there is no way in by court id alone.
 */
export const fetchOwnedCourts = (userId: string, venueId: string): Promise<OwnedCourt[]> =>
  apiFetch<OwnedCourt[]>(`/venues/${venueId}/courts`, { userId, revalidate: 0 });

export const createCourt = (userId: string, venueId: string, body: UpsertCourtBody): Promise<{ courtId: string }> =>
  apiFetch<{ courtId: string }>(`/venues/${venueId}/courts`, { method: 'POST', body, userId });

export const updateCourt = (userId: string, venueId: string, courtId: string, body: UpsertCourtBody): Promise<void> =>
  apiFetch<void>(`/venues/${venueId}/courts/${courtId}`, { method: 'PUT', body, userId });

export const archiveCourt = (userId: string, venueId: string, courtId: string): Promise<void> =>
  apiFetch<void>(`/venues/${venueId}/courts/${courtId}`, { method: 'DELETE', userId });

export const restoreCourt = (userId: string, venueId: string, courtId: string): Promise<void> =>
  apiFetch<void>(`/venues/${venueId}/courts/${courtId}/restore`, { method: 'POST', userId });

export const fetchCourtPricing = (userId: string, venueId: string, courtId: string): Promise<CourtPricingResponse> =>
  apiFetch<CourtPricingResponse>(`/venues/${venueId}/courts/${courtId}/pricing`, { userId, revalidate: 0 });

export const createPriceRule = (
  userId: string,
  venueId: string,
  courtId: string,
  body: UpsertPriceRuleBody
): Promise<PriceRuleSummary> =>
  apiFetch<PriceRuleSummary>(`/venues/${venueId}/courts/${courtId}/price-rules`, { method: 'POST', body, userId });

export const deletePriceRule = (userId: string, venueId: string, courtId: string, ruleId: string): Promise<void> =>
  apiFetch<void>(`/venues/${venueId}/courts/${courtId}/price-rules/${ruleId}`, { method: 'DELETE', userId });

export const replaceOpeningWindows = (
  userId: string,
  venueId: string,
  courtId: string,
  body: ReplaceOpeningWindowsBody
): Promise<OpeningWindowSummary[]> =>
  apiFetch<OpeningWindowSummary[]>(`/venues/${venueId}/courts/${courtId}/opening-windows`, {
    method: 'PUT',
    body,
    userId,
  });

/**
 * Sign-in only, and the one call that carries the service key instead of a user token —
 * it runs before any user token can exist.
 */
export const upsertIdentity = (email: string, name: string): Promise<UpsertIdentityResponse> =>
  apiFetch<UpsertIdentityResponse>('/identities', { method: 'POST', body: { email, name }, serviceKey: true });
