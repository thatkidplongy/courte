import type { VenueMembershipSummary } from '@courte/contract';

import { query } from '@/db/client';
import type { MembershipReader, VenueMembership, VenueRole } from '@/domain/authz/venueAccess';

type MembershipRow = {
  venue_id: number;
  user_id: number;
  role: VenueRole;
};

const toMembership = (row: MembershipRow): VenueMembership => ({
  venueId: row.venue_id,
  userId: row.user_id,
  role: row.role,
});

/**
 * Read fresh on every request, deliberately never cached into the session: removing a staff
 * member must lock them out on their next request, not when a token expires. The composite
 * primary key makes findMembership a single index hit.
 */
export const findMembership = async (userId: number, venueId: number): Promise<VenueMembership | null> => {
  const rows = await query<MembershipRow>(
    'SELECT venue_id, user_id, role FROM "VenueMember" WHERE user_id = $1 AND venue_id = $2',
    [userId, venueId]
  );
  const row = rows[0];
  return row ? toMembership(row) : null;
};

/** Feeds navigation: which venues get a "Manage" link for this user. */
export const findMembershipsForUser = async (userId: number): Promise<VenueMembership[]> => {
  const rows = await query<MembershipRow>(
    `SELECT vm.venue_id, vm.user_id, vm.role
     FROM "VenueMember" vm
     JOIN "Venue" v ON v.id = vm.venue_id
     WHERE vm.user_id = $1
     ORDER BY v.name ASC`,
    [userId]
  );
  return rows.map(toMembership);
};

export const membershipReader: MembershipReader = {
  findMembership,
  findMembershipsForUser,
};

type MembershipSummaryRow = {
  venue_id: number;
  venue_name: string;
  role: VenueRole;
};

/**
 * The same memberships joined to their venue names. A separate method rather than a flag on
 * findMembershipsForUser: "which venues, named" is a different question from "which roles",
 * and the domain's MembershipReader port must stay free of presentation concerns.
 */
export const findVenueMembershipSummaries = async (userId: number): Promise<VenueMembershipSummary[]> => {
  const rows = await query<MembershipSummaryRow>(
    `SELECT vm.venue_id, v.name AS venue_name, vm.role
     FROM "VenueMember" vm
     JOIN "Venue" v ON v.id = vm.venue_id
     WHERE vm.user_id = $1
     ORDER BY v.name ASC`,
    [userId]
  );

  return rows.map(row => ({ venueId: row.venue_id, venueName: row.venue_name, role: row.role }));
};
