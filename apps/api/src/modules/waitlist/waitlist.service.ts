import { Injectable } from '@nestjs/common';

import type { JoinWaitlistBody, WaitlistEntry } from '@courte/contract';

import { findCourtById } from '@/db/repositories/courtRepository';
import {
  findWaitlistEntriesForUser,
  insertWaitlistEntry,
  type UserWaitlistEntry,
} from '@/db/repositories/waitlistRepository';
import { NotFoundError } from '@/domain/errors';

@Injectable()
export class WaitlistService {
  /**
   * "Tell me if anything opens up between X and Y." The sweep and cancellation paths offer
   * released ranges to the oldest matching entry; the offer lands in the player's list with
   * a claim window.
   *
   * The window's own coherence — ends after it starts, long enough for the requested minimum
   * — is enforced by the schema at the edge, so nothing is re-checked here.
   */
  async joinWaitlist(userId: number, body: JoinWaitlistBody): Promise<{ entryId: number }> {
    const court = await findCourtById(body.courtId);
    if (!court) throw new NotFoundError('Court');

    const entryId = await insertWaitlistEntry({
      userId,
      courtId: court.id,
      desiredStart: new Date(body.desiredStartIso),
      desiredEnd: new Date(body.desiredEndIso),
      minDurationMinutes: body.minDurationMinutes,
    });

    return { entryId };
  }

  async listEntries(userId: number): Promise<WaitlistEntry[]> {
    const entries = await findWaitlistEntriesForUser(userId);
    return entries.map(entry => this.toEntry(entry));
  }

  private toEntry(entry: UserWaitlistEntry): WaitlistEntry {
    return {
      id: entry.id,
      state: entry.state,
      desiredStartIso: entry.desiredStart.toISOString(),
      desiredEndIso: entry.desiredEnd.toISOString(),
      courtName: entry.courtName,
      venueName: entry.venueName,
      venueTimezone: entry.venueTimezone,
      offeredCourtId: entry.offeredCourtId,
      offeredStartIso: entry.offeredStart?.toISOString() ?? null,
      claimExpiresAtIso: entry.claimExpiresAt?.toISOString() ?? null,
    };
  }
}
