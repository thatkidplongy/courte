import 'server-only';

import type {
  AddBlackoutBody,
  BookingSummary,
  CourtAvailabilityResponse,
  CourtSearchItem,
  CreateSeriesBody,
  CreateSeriesResponse,
  JoinWaitlistBody,
  Paginated,
  PlaceHoldBody,
  PlaceHoldResponse,
  RecordPaymentBody,
  RecordPaymentResponse,
  RecordWalkInBody,
  RecordWalkInResponse,
  Sport,
  UpsertIdentityResponse,
  VenueDashboardResponse,
  VenueMembershipSummary,
  WaitlistEntry,
} from '@courte/contract';

import { apiFetch } from './client';

/**
 * One function per endpoint, named for what the page is asking rather than for the verb and
 * path. Pages import these; nothing else in the app constructs a URL.
 *
 * Reads pass `revalidate: 0` throughout — availability is the product, and a cached chip that
 * has already been booked is worse than a slower page.
 */

export const searchCourts = (params: {
  sport: Sport;
  date: string;
  page?: number;
}): Promise<Paginated<CourtSearchItem>> => {
  const query = new URLSearchParams({ sport: params.sport, date: params.date });
  if (params.page) query.set('page', String(params.page));

  return apiFetch<Paginated<CourtSearchItem>>(`/courts?${query.toString()}`, { revalidate: 0 });
};

export const fetchCourtAvailability = (courtId: string, date?: string): Promise<CourtAvailabilityResponse> => {
  const query = date ? `?${new URLSearchParams({ date }).toString()}` : '';
  return apiFetch<CourtAvailabilityResponse>(`/courts/${courtId}${query}`, { revalidate: 0 });
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
 * Sign-in only, and the one call that carries the service key instead of a user token —
 * it runs before any user token can exist.
 */
export const upsertIdentity = (email: string, name: string): Promise<UpsertIdentityResponse> =>
  apiFetch<UpsertIdentityResponse>('/identities', { method: 'POST', body: { email, name }, serviceKey: true });
