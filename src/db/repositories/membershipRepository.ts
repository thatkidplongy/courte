import { query } from '@/db/client';
import type { MembershipReader, VenueMembership, VenueRole } from '@/domain/authz/venueAccess';

type MembershipRow = {
  venue_id: string;
  user_id: string;
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
export const findMembership = async (userId: string, venueId: string): Promise<VenueMembership | null> => {
  const rows = await query<MembershipRow>(
    'SELECT venue_id, user_id, role FROM venue_members WHERE user_id = $1 AND venue_id = $2',
    [userId, venueId]
  );
  const row = rows[0];
  return row ? toMembership(row) : null;
};

/** Feeds navigation: which venues get a "Manage" link for this user. */
export const findMembershipsForUser = async (userId: string): Promise<VenueMembership[]> => {
  const rows = await query<MembershipRow>(
    `SELECT vm.venue_id, vm.user_id, vm.role
     FROM venue_members vm
     JOIN venues v ON v.id = vm.venue_id
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
