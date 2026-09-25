import 'server-only';

import type { UpsertIdentityResponse } from '@courte/contract';

import { apiFetch } from './client';

/**
 * Sign-in only, and the one call that carries the service key instead of a user token —
 * it runs before any user token can exist.
 */
export const upsertIdentity = (email: string, name: string): Promise<UpsertIdentityResponse> =>
  apiFetch<UpsertIdentityResponse>('/identities', { method: 'POST', body: { email, name }, serviceKey: true });
