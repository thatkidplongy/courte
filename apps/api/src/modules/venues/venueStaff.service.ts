import { Injectable } from '@nestjs/common';

import type { AddVenueMemberBody, VenueStaffMember } from '@courte/contract';

import {
  countVenueOwners,
  deleteVenueMember,
  findUserIdByEmail,
  findVenueStaff,
  membershipReader,
  upsertVenueMember,
} from '@/db/repositories/membershipRepository';
import { assertOwnerRemains } from '@/domain/authz/assertOwnerRemains';
import { requireVenueAction } from '@/domain/authz/venueAccess';
import { NotFoundError, ValidationError } from '@/domain/errors';

/**
 * Who works here, and what they may do. Owner-only, and the only one of the three venue
 * services that can lock somebody out of a venue permanently — which is why the last-owner
 * rule lives behind every write in it.
 *
 * Every method re-checks venue membership for itself through requireVenueAction: a route guard
 * protects routing, never the action, and authorization belongs at the point of access.
 */
@Injectable()
export class VenueStaffService {
  async listStaff(userId: number, venueId: number): Promise<VenueStaffMember[]> {
    const membership = await requireVenueAction(membershipReader, userId, venueId, 'manageStaff');
    const staff = await findVenueStaff(venueId);

    return staff.map(member => ({ ...member, isSelf: member.userId === membership.userId }));
  }

  /**
   * Added by email, because that is what an owner knows about the person they are hiring.
   *
   * An address that has never signed in is refused rather than creating a shell "User" row:
   * that row would be an account nobody controls, and whoever first signed in with the address
   * would silently inherit whatever it had been granted.
   */
  async addStaff(userId: number, venueId: number, body: AddVenueMemberBody): Promise<void> {
    await requireVenueAction(membershipReader, userId, venueId, 'manageStaff');

    const invitedId = await findUserIdByEmail(body.email);
    if (!invitedId) {
      throw new ValidationError('Nobody has signed in with that email yet. Ask them to sign in once first.', [
        { field: 'email', message: 'no account with that address' },
      ]);
    }

    // This is an upsert, so it is also the DEMOTION path: posting the sole owner's own email
    // with role 'staff' rewrites their row and leaves a venue nobody can administer. Easy to
    // miss on a method named for adding, which is why the rule lives in one shared function.
    const existing = await membershipReader.findMembership(invitedId, venueId);
    assertOwnerRemains({
      currentRole: existing?.role ?? null,
      nextRole: body.role,
      ownerCount: await countVenueOwners(venueId),
    });

    await upsertVenueMember(venueId, invitedId, body.role);
  }

  /**
   * Two refusals, and both are about locking somebody out of something they cannot get back.
   *
   * Removing the last owner leaves a venue nobody can administer — no way to add a court, set a
   * price, or appoint a replacement owner. And an owner removing themselves does the same thing
   * one step slower, so it is refused separately with a message that says what to do instead.
   *
   * The self-check makes the last-owner branch unreachable from here today, since a caller who
   * can reach this is by definition an owner. It stays because `addStaff` shares the rule and
   * can reach it, and because the day a transfer-ownership path exists it will reach it too.
   */
  async removeStaff(userId: number, venueId: number, memberId: number): Promise<void> {
    const membership = await requireVenueAction(membershipReader, userId, venueId, 'manageStaff');

    if (memberId === membership.userId) {
      throw new ValidationError('You cannot remove yourself. Ask another owner to do it.');
    }

    const target = await membershipReader.findMembership(memberId, venueId);
    if (!target) throw new NotFoundError('Staff member');

    assertOwnerRemains({
      currentRole: target.role,
      nextRole: null,
      ownerCount: await countVenueOwners(venueId),
    });

    const removed = await deleteVenueMember(venueId, memberId);
    if (!removed) throw new NotFoundError('Staff member');
  }
}
