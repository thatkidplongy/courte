import { ValidationError } from '@/domain/errors';

import type { VenueRole } from './venueAccess';

/**
 * A venue must always keep at least one owner.
 *
 * This is not a nicety. `manageStaff` is an owner-only action, so a venue that reaches zero
 * owners cannot appoint one: nobody can add a court, set a price, or restore administration.
 * There is no recovery path short of a hand-written UPDATE against the database.
 *
 * Two writes can reach that state and both must go through here:
 *
 *   * removing an owner, and
 *   * DEMOTING one — `addStaff` is an upsert, so posting an existing owner's email with
 *     `role: 'staff'` rewrites their row. That path is easy to miss precisely because it is
 *     named for adding, and it is how a sole owner can lock themselves out in one request.
 */
export const assertOwnerRemains = ({
  currentRole,
  nextRole,
  ownerCount,
}: {
  /** The target's role today, or null when they are not yet a member. */
  currentRole: VenueRole | null;
  /** The role they are being moved to, or null when they are being removed. */
  nextRole: VenueRole | null;
  /** How many owners the venue has right now, the target included. */
  ownerCount: number;
}): void => {
  const isLosingAnOwner = currentRole === 'owner' && nextRole !== 'owner';
  if (isLosingAnOwner && ownerCount <= 1) {
    throw new ValidationError('A venue must keep at least one owner. Appoint another owner first.');
  }
};
