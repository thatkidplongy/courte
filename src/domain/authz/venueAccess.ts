import { NotFoundError, NotPermittedError } from '@/domain/errors';

/**
 * Venue-scoped authorization. Roles in Courte attach to a (user, venue) pair, never globally
 * to a user: the same account is a player everywhere and may be owner of one venue and staff
 * at another. Anything answering "can this user manage X?" resolves through here.
 *
 * The one asymmetry that matters: failing the "are you a member at all?" question raises
 * NotFoundError, not NotPermittedError — an outsider probing /manage/<id> must not be able to
 * distinguish a real venue from a fabricated one. NotPermittedError is reserved for users who
 * are already inside (staff hitting an owner-only action), where hiding existence is pointless.
 */

export const VENUE_ROLES = ['owner', 'staff'] as const;
export type VenueRole = (typeof VENUE_ROLES)[number];

export type VenueMembership = {
  venueId: string;
  userId: string;
  role: VenueRole;
};

export type MembershipReader = {
  findMembership(userId: string, venueId: string): Promise<VenueMembership | null>;
  findMembershipsForUser(userId: string): Promise<VenueMembership[]>;
};

/** Staff can run the desk; owners can also change what the venue sells and who works there. */
const STAFF_ACTIONS = [
  'recordWalkIn',
  'recordPayment',
  'markNoShow',
  'viewBookings',
  'cancelBooking',
  'blockCourt',
] as const;
const OWNER_ACTIONS = [...STAFF_ACTIONS, 'manageCourts', 'manageHours', 'managePricing', 'manageStaff', 'viewRevenue'] as const;

export type VenueAction = (typeof OWNER_ACTIONS)[number];

const ACTIONS_BY_ROLE: Record<VenueRole, readonly VenueAction[]> = {
  owner: OWNER_ACTIONS,
  staff: STAFF_ACTIONS,
};

export const canPerform = (role: VenueRole, action: VenueAction): boolean => ACTIONS_BY_ROLE[role].includes(action);

/**
 * The gate the manage layout and every venue-scoped server action call. Default deny: no
 * membership row means the venue does not exist as far as this user is concerned.
 */
export const requireVenueAction = async (
  memberships: MembershipReader,
  userId: string,
  venueId: string,
  action: VenueAction
): Promise<VenueMembership> => {
  const membership = await memberships.findMembership(userId, venueId);
  if (!membership) throw new NotFoundError('Venue');
  if (!canPerform(membership.role, action)) throw new NotPermittedError();

  return membership;
};
