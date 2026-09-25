import 'server-only';

import type {
  CourtPricingResponse,
  OpeningWindowSummary,
  OwnedCourt,
  PriceRuleSummary,
  ReplaceOpeningWindowsBody,
  UpsertCourtBody,
  UpsertPriceRuleBody,
} from '@courte/contract';

import { apiFetch } from './client';

/**
 * Owner-side inventory. Every path is nested under the venue, because that is what the API
 * authorises against — there is no way in by court id alone.
 */
export const fetchOwnedCourts = (userId: number, venueId: number): Promise<OwnedCourt[]> =>
  apiFetch<OwnedCourt[]>(`/venues/${venueId}/courts`, { userId, revalidate: 0 });

export const createCourt = (userId: number, venueId: number, body: UpsertCourtBody): Promise<{ courtId: number }> =>
  apiFetch<{ courtId: number }>(`/venues/${venueId}/courts`, { method: 'POST', body, userId });

export const updateCourt = (userId: number, venueId: number, courtId: number, body: UpsertCourtBody): Promise<void> =>
  apiFetch<void>(`/venues/${venueId}/courts/${courtId}`, { method: 'PUT', body, userId });

export const archiveCourt = (userId: number, venueId: number, courtId: number): Promise<void> =>
  apiFetch<void>(`/venues/${venueId}/courts/${courtId}`, { method: 'DELETE', userId });

export const restoreCourt = (userId: number, venueId: number, courtId: number): Promise<void> =>
  apiFetch<void>(`/venues/${venueId}/courts/${courtId}/restore`, { method: 'POST', userId });

export const fetchCourtPricing = (userId: number, venueId: number, courtId: number): Promise<CourtPricingResponse> =>
  apiFetch<CourtPricingResponse>(`/venues/${venueId}/courts/${courtId}/pricing`, { userId, revalidate: 0 });

export const createPriceRule = (
  userId: number,
  venueId: number,
  courtId: number,
  body: UpsertPriceRuleBody
): Promise<PriceRuleSummary> =>
  apiFetch<PriceRuleSummary>(`/venues/${venueId}/courts/${courtId}/price-rules`, { method: 'POST', body, userId });

export const deletePriceRule = (userId: number, venueId: number, courtId: number, ruleId: number): Promise<void> =>
  apiFetch<void>(`/venues/${venueId}/courts/${courtId}/price-rules/${ruleId}`, { method: 'DELETE', userId });

export const replaceOpeningWindows = (
  userId: number,
  venueId: number,
  courtId: number,
  body: ReplaceOpeningWindowsBody
): Promise<OpeningWindowSummary[]> =>
  apiFetch<OpeningWindowSummary[]>(`/venues/${venueId}/courts/${courtId}/opening-windows`, {
    method: 'PUT',
    body,
    userId,
  });
