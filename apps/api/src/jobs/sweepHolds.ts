import { query } from '@/db/client';
import { releaseExpiredHolds } from '@/db/repositories/reservationRepository';
import { logger } from '@/lib/logger';

import { offerReleasedRanges } from './offerReleasedRanges';

/**
 * Runs every minute (vercel.json). Two duties that must happen in this order:
 *   1. Release holds past their TTL — the constraint cannot expire them declaratively
 *      (docs/adr/0002), so until this runs a lapsed hold still blocks its slot.
 *   2. Offer the freed ranges to the waitlist, oldest matching entry first.
 *
 * Every step is idempotent, so a crashed or double-fired run is harmless: releases are
 * state-guarded updates, offers only flip rows still in 'waiting'.
 */
export const sweepHolds = async (): Promise<{ released: number; offered: number; bookingsCancelled: number }> => {
  const released = await releaseExpiredHolds();
  if (released.length === 0) return { released: 0, offered: 0, bookingsCancelled: 0 };

  // A swept hold's booking is dead: the player never confirmed. Without this, confirm
  // attempts on long-abandoned checkouts would linger as 'pending' rows forever.
  const bookingIds = [...new Set(released.map(r => r.bookingId).filter((id): id is number => id !== null))];
  const cancelled = await query<{ id: number }>(
    `UPDATE "Booking" SET status = 'cancelled', cancelled_at = now()
     WHERE id = ANY($1::bigint[]) AND status = 'pending'
     RETURNING id`,
    [bookingIds]
  );

  const offered = await offerReleasedRanges(released);

  logger.info({ released: released.length, offered, bookingsCancelled: cancelled.length }, 'hold sweep complete');

  return { released: released.length, offered, bookingsCancelled: cancelled.length };
};
