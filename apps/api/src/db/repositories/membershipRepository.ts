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

/** Everyone who works at a venue. Owners first, then by name — the list reads as a hierarchy. */
export const findVenueStaff = async (
  venueId: number
): Promise<Array<{ userId: number; name: string; email: string; role: VenueRole }>> => {
  const rows = await query<{ user_id: number; name: string; email: string; role: VenueRole }>(
    `SELECT vm.user_id, u.name, u.email::text AS email, vm.role
     FROM "VenueMember" vm
     JOIN "User" u ON u.id = vm.user_id
     WHERE vm.venue_id = $1
     ORDER BY (vm.role = 'owner') DESC, u.name ASC`,
    [venueId]
  );

  return rows.map(row => ({ userId: row.user_id, name: row.name, email: row.email, role: row.role }));
};

/**
 * By email, because that is what an owner knows about the person they are hiring. Returns null
 * for an address that has never signed in: creating a shell account here would put a row in
 * "User" that nobody controls, and the first person to sign in with that address would silently
 * inherit whatever it had been granted.
 */
export const findUserIdByEmail = async (email: string): Promise<number | null> => {
  const rows = await query<{ id: number }>('SELECT id FROM "User" WHERE email = $1', [email]);
  return rows[0]?.id ?? null;
};

/**
 * Upsert, not insert: changing somebody from staff to owner is the same gesture as adding them,
 * and making the owner remove-then-re-add would briefly lock a colleague out of their own venue.
 */
export const upsertVenueMember = async (venueId: number, userId: number, role: VenueRole): Promise<void> => {
  await query(
    `INSERT INTO "VenueMember" (venue_id, user_id, role) VALUES ($1, $2, $3)
     ON CONFLICT (venue_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
    [venueId, userId, role]
  );
};

export const deleteVenueMember = async (venueId: number, userId: number): Promise<boolean> => {
  const rows = await query<{ user_id: number }>(
    'DELETE FROM "VenueMember" WHERE venue_id = $1 AND user_id = $2 RETURNING user_id',
    [venueId, userId]
  );
  return rows.length > 0;
};

/** Guards the last-owner rule: a venue nobody owns can never be administered again. */
export const countVenueOwners = async (venueId: number): Promise<number> => {
  const rows = await query<{ owners: string }>(
    `SELECT count(*) AS owners FROM "VenueMember" WHERE venue_id = $1 AND role = 'owner'`,
    [venueId]
  );
  return Number(rows[0]?.owners ?? 0);
};
