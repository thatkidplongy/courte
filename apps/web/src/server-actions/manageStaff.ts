'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { VENUE_ROLES, type VenueRole } from '@courte/contract';

import { auth } from '@/auth';
import { MALFORMED_ID_ERROR } from '@/consts';
import { addVenueMember, removeVenueMember } from '@/lib/api';
import { ApiError } from '@/lib/api/client';
import { readFormId } from '@/lib/ids';
import type { ManageFormState } from '@/server-actions/manageVenue';

const isVenueRole = (value: string): value is VenueRole => VENUE_ROLES.includes(value as VenueRole);

/**
 * Adding and changing a role are the same request, because they are the same gesture: an owner
 * promoting a colleague should not have to remove them first, which would lock that colleague
 * out of their own venue for the moment in between.
 *
 * The rule that a venue must keep at least one owner is enforced by the API, not here — this
 * form is one of two paths to it, and a copy in the browser would be the one that drifts.
 */
export const addStaff = async (_previous: ManageFormState, formData: FormData): Promise<ManageFormState> => {
  const session = await auth();
  if (!session?.courteUserId) redirect('/');

  const venueId = readFormId(formData, 'venueId');
  if (venueId === null) return { error: MALFORMED_ID_ERROR };

  const role = String(formData.get('role') ?? '');
  if (!isVenueRole(role)) return { error: 'Choose a role' };

  const email = String(formData.get('email') ?? '').trim();
  if (email === '') return { error: 'Enter an email address' };

  try {
    await addVenueMember(session.courteUserId, venueId, { email, role });
  } catch (error) {
    if (error instanceof ApiError) return { error: error.toFormMessage() };
    throw error;
  }

  revalidatePath(`/manage/${venueId}/staff`);
  return { ok: true };
};

export const removeStaff = async (_previous: ManageFormState, formData: FormData): Promise<ManageFormState> => {
  const session = await auth();
  if (!session?.courteUserId) redirect('/');

  const venueId = readFormId(formData, 'venueId');
  if (venueId === null) return { error: MALFORMED_ID_ERROR };
  const memberId = readFormId(formData, 'memberId');
  if (memberId === null) return { error: MALFORMED_ID_ERROR };

  try {
    await removeVenueMember(session.courteUserId, venueId, memberId);
  } catch (error) {
    if (error instanceof ApiError) return { error: error.toFormMessage() };
    throw error;
  }

  revalidatePath(`/manage/${venueId}/staff`);
  return { ok: true };
};
