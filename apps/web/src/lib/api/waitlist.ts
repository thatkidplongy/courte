import 'server-only';

import type { JoinWaitlistBody, WaitlistEntry } from '@courte/contract';

import { apiFetch } from './client';

export const joinWaitlist = (userId: number, body: JoinWaitlistBody): Promise<{ entryId: number }> =>
  apiFetch<{ entryId: number }>('/waitlist-entries', { method: 'POST', body, userId });

export const fetchWaitlistEntries = (userId: number): Promise<WaitlistEntry[]> =>
  apiFetch<WaitlistEntry[]>('/waitlist-entries', { userId, revalidate: 0 });
