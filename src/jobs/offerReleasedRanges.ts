import { env } from '@/config/env';
import { findVenueIdsForCourts } from '@/db/repositories/venueRepository';
import { findWaitingCandidates, markOffered } from '@/db/repositories/waitlistRepository';
import { matchOffers, type ReleasedRange } from '@/domain/waitlist/matchOffers';

export type ReleasedSlot = {
  courtId: string;
  duringStart: Date;
  duringEnd: Date;
};

/**
 * Offers freed court time to the waitlist. Shared by the hold sweeper and the cancellation
 * path — a slot freed by an expired hold and one freed by a cancellation are the same event
 * to the person waiting for it.
 */
export const offerReleasedRanges = async (released: ReleasedSlot[]): Promise<number> => {
  if (released.length === 0) return 0;

  const venueByCourt = await findVenueIdsForCourts([...new Set(released.map(slot => slot.courtId))]);
  const ranges: ReleasedRange[] = released.flatMap(slot => {
    const venueId = venueByCourt.get(slot.courtId);
    if (!venueId) return [];
    return [
      {
        courtId: slot.courtId,
        venueId,
        interval: { start: slot.duringStart.getTime(), end: slot.duringEnd.getTime() },
      },
    ];
  });

  if (ranges.length === 0) return 0;

  const windowStart = new Date(Math.min(...ranges.map(range => range.interval.start)));
  const windowEnd = new Date(Math.max(...ranges.map(range => range.interval.end)));
  const candidates = await findWaitingCandidates([...new Set(ranges.map(range => range.venueId))], windowStart, windowEnd);

  const offers = matchOffers(ranges, candidates);
  if (offers.length === 0) return 0;

  const claimExpiresAt = new Date(Date.now() + env.WAITLIST_CLAIM_MINUTES * 60_000);
  return markOffered(offers, claimExpiresAt);
};
