import type { Interval } from '@/domain/availability/types';

/**
 * Decides who gets offered a freshly released range. Pure: the job fetches candidates and
 * persists outcomes; this module only ranks and filters.
 *
 * One offer per released range, to the longest-waiting matching entry — an offer is a
 * temporary monopoly, and fanning the same range out to everyone would make the claim a
 * race the UI pretends isn't there. If the offer lapses, the sweeper simply reruns this
 * against the next-oldest entry.
 */

export type ReleasedRange = {
  courtId: number;
  venueId: number;
  interval: Interval;
};

export type WaitlistCandidate = {
  id: number;
  courtId: number | null;
  venueId: number | null;
  desired: Interval;
  minDurationMinutes: number;
  createdAt: Date;
};

export type Offer = {
  entryId: number;
  courtId: number;
  interval: Interval;
};

const overlap = (a: Interval, b: Interval): Interval | null => {
  const start = Math.max(a.start, b.start);
  const end = Math.min(a.end, b.end);
  return start < end ? { start, end } : null;
};

const matchesTarget = (candidate: WaitlistCandidate, released: ReleasedRange): boolean => {
  if (candidate.courtId) return candidate.courtId === released.courtId;
  return candidate.venueId === released.venueId;
};

export const matchOffers = (released: ReleasedRange[], candidates: WaitlistCandidate[]): Offer[] => {
  const byOldest = [...candidates].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const offered = new Set<number>();
  const offers: Offer[] = [];

  for (const range of released) {
    for (const candidate of byOldest) {
      if (offered.has(candidate.id)) continue;
      if (!matchesTarget(candidate, range)) continue;

      const usable = overlap(candidate.desired, range.interval);
      if (!usable) continue;
      if (usable.end - usable.start < candidate.minDurationMinutes * 60_000) continue;

      offers.push({ entryId: candidate.id, courtId: range.courtId, interval: usable });
      offered.add(candidate.id);
      break;
    }
  }

  return offers;
};
