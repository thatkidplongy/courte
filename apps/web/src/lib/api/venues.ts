import 'server-only';

import type {
  AddBlackoutBody,
  AddVenueMemberBody,
  MarkNoShowBody,
  RecordPaymentBody,
  RecordPaymentResponse,
  RecordWalkInBody,
  RecordWalkInResponse,
  VenueDashboardResponse,
  VenueMembershipSummary,
  VenueStaffMember,
} from '@courte/contract';

import { apiFetch } from './client';

export const fetchVenueMemberships = (userId: number): Promise<VenueMembershipSummary[]> =>
  apiFetch<VenueMembershipSummary[]>('/venues/memberships', { userId, revalidate: 0 });

export const fetchVenueDashboard = (userId: number, venueId: number): Promise<VenueDashboardResponse> =>
  apiFetch<VenueDashboardResponse>(`/venues/${venueId}/dashboard`, { userId, revalidate: 0 });

export const recordWalkIn = (userId: number, venueId: number, body: RecordWalkInBody): Promise<RecordWalkInResponse> =>
  apiFetch<RecordWalkInResponse>(`/venues/${venueId}/walk-ins`, { method: 'POST', body, userId });

export const addBlackout = (userId: number, venueId: number, body: AddBlackoutBody): Promise<void> =>
  apiFetch<void>(`/venues/${venueId}/blackouts`, { method: 'POST', body, userId });

export const recordPayment = (
  userId: number,
  venueId: number,
  body: RecordPaymentBody
): Promise<RecordPaymentResponse> =>
  apiFetch<RecordPaymentResponse>(`/venues/${venueId}/payments`, { method: 'POST', body, userId });

export const markNoShow = (userId: number, venueId: number, body: MarkNoShowBody): Promise<void> =>
  apiFetch<void>(`/venues/${venueId}/no-shows`, { method: 'POST', body, userId });

/** Who works here. Owner-only on the API, so a staff caller gets a 403 rather than a list. */
export const fetchVenueStaff = (userId: number, venueId: number): Promise<VenueStaffMember[]> =>
  apiFetch<VenueStaffMember[]>(`/venues/${venueId}/staff`, { userId, revalidate: 0 });

export const addVenueMember = (userId: number, venueId: number, body: AddVenueMemberBody): Promise<void> =>
  apiFetch<void>(`/venues/${venueId}/staff`, { method: 'POST', body, userId });

export const removeVenueMember = (userId: number, venueId: number, memberId: number): Promise<void> =>
  apiFetch<void>(`/venues/${venueId}/staff/${memberId}`, { method: 'DELETE', userId });
