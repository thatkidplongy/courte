import { describe, expect, it, vi } from 'vitest';

import { NotFoundError, NotPermittedError } from '@/domain/errors';

import type { MembershipReader, VenueMembership } from './venueAccess';
import { canPerform, requireVenueAction } from './venueAccess';

const readerWith = (membership: VenueMembership | null): MembershipReader => ({
  findMembership: vi.fn().mockResolvedValue(membership),
  findMembershipsForUser: vi.fn().mockResolvedValue(membership ? [membership] : []),
});

describe('canPerform', () => {
  it('lets staff run the desk', () => {
    expect(canPerform('staff', 'recordWalkIn')).toBe(true);
    expect(canPerform('staff', 'recordPayment')).toBe(true);
    expect(canPerform('staff', 'markNoShow')).toBe(true);
  });

  it('keeps venue configuration owner-only', () => {
    expect(canPerform('staff', 'manageCourts')).toBe(false);
    expect(canPerform('staff', 'managePricing')).toBe(false);
    expect(canPerform('staff', 'manageStaff')).toBe(false);
    expect(canPerform('staff', 'viewRevenue')).toBe(false);
  });

  it('grants owners everything staff have', () => {
    expect(canPerform('owner', 'recordWalkIn')).toBe(true);
    expect(canPerform('owner', 'manageStaff')).toBe(true);
  });
});

describe('requireVenueAction', () => {
  it('returns the membership when the role allows the action', async () => {
    const membership: VenueMembership = { venueId: 'v1', userId: 'u1', role: 'staff' };

    await expect(requireVenueAction(readerWith(membership), 'u1', 'v1', 'recordWalkIn')).resolves.toEqual(membership);
  });

  it('reports not-found for a non-member, hiding whether the venue exists', async () => {
    await expect(requireVenueAction(readerWith(null), 'outsider', 'v1', 'viewBookings')).rejects.toBeInstanceOf(
      NotFoundError
    );
  });

  it('reports not-permitted for a member whose role is insufficient', async () => {
    const membership: VenueMembership = { venueId: 'v1', userId: 'u1', role: 'staff' };

    await expect(requireVenueAction(readerWith(membership), 'u1', 'v1', 'viewRevenue')).rejects.toBeInstanceOf(
      NotPermittedError
    );
  });
});
