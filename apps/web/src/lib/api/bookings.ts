import 'server-only';

import type {
  BookingSummary,
  CreateSeriesBody,
  CreateSeriesResponse,
  Paginated,
  PlaceHoldBody,
  PlaceHoldResponse,
} from '@courte/contract';

import { apiFetch } from './client';

export const placeHold = (userId: number, body: PlaceHoldBody): Promise<PlaceHoldResponse> =>
  apiFetch<PlaceHoldResponse>('/holds', { method: 'POST', body, userId });

export const fetchBooking = (userId: number, bookingId: number): Promise<BookingSummary> =>
  apiFetch<BookingSummary>(`/bookings/${bookingId}`, { userId, revalidate: 0 });

export const fetchBookings = (userId: number): Promise<Paginated<BookingSummary>> =>
  apiFetch<Paginated<BookingSummary>>('/bookings', { userId, revalidate: 0 });

export const confirmBooking = (userId: number, bookingId: number): Promise<void> =>
  apiFetch<void>(`/bookings/${bookingId}/confirm`, { method: 'POST', userId });

export const cancelBooking = (userId: number, bookingId: number): Promise<void> =>
  apiFetch<void>(`/bookings/${bookingId}/cancel`, { method: 'POST', userId });

export const createSeries = (userId: number, body: CreateSeriesBody): Promise<CreateSeriesResponse> =>
  apiFetch<CreateSeriesResponse>('/series', { method: 'POST', body, userId });
