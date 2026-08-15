'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { PAYMENT_METHODS, type PaymentMethod } from '@courte/contract';

import { auth } from '@/auth';
import { MALFORMED_ID_ERROR } from '@/consts';
import { ApiError } from '@/lib/api/client';
import {
  addBlackout as addBlackoutRequest,
  markNoShow as markNoShowRequest,
  recordPayment as recordPaymentRequest,
  recordWalkIn as recordWalkInRequest,
} from '@/lib/api/resources';
import { readFormId } from '@/lib/ids';

export type ManageFormState = {
  error?: string;
  ok?: boolean;
};

/**
 * Desk operations. Membership is re-checked by the API inside every one of these — the
 * layout's gate protects pages, never mutations, and a token proves who you are rather than
 * what you may do at a given venue.
 */

const revalidateVenue = (venueId: number): void => {
  revalidatePath(`/manage/${venueId}`);
};

export const recordWalkIn = async (_previous: ManageFormState, formData: FormData): Promise<ManageFormState> => {
  const session = await auth();
  if (!session?.courteUserId) redirect('/');

  const venueId = readFormId(formData, 'venueId');

  if (venueId === null) return { error: MALFORMED_ID_ERROR };
  const courtId = readFormId(formData, 'courtId');
  if (courtId === null) return { error: MALFORMED_ID_ERROR };

  try {
    await recordWalkInRequest(session.courteUserId, venueId, {
      courtId: courtId,
      customerName: String(formData.get('customerName') ?? ''),
      startIso: String(formData.get('startIso') ?? ''),
      durationMinutes: Number(formData.get('durationMinutes')),
      source: formData.get('source') === 'phone' ? 'phone' : 'walk_in',
    });
  } catch (error) {
    if (error instanceof ApiError) return { error: error.toFormMessage() };
    throw error;
  }

  revalidateVenue(venueId);
  return { ok: true };
};

export const addBlackout = async (_previous: ManageFormState, formData: FormData): Promise<ManageFormState> => {
  const session = await auth();
  if (!session?.courteUserId) redirect('/');

  const venueId = readFormId(formData, 'venueId');

  if (venueId === null) return { error: MALFORMED_ID_ERROR };
  const courtId = readFormId(formData, 'courtId');
  if (courtId === null) return { error: MALFORMED_ID_ERROR };

  try {
    await addBlackoutRequest(session.courteUserId, venueId, {
      courtId: courtId,
      reason: String(formData.get('reason') ?? ''),
      startIso: String(formData.get('startIso') ?? ''),
      endIso: String(formData.get('endIso') ?? ''),
    });
  } catch (error) {
    if (error instanceof ApiError) return { error: error.toFormMessage() };
    throw error;
  }

  revalidateVenue(venueId);
  return { ok: true };
};

export const markNoShow = async (_previous: ManageFormState, formData: FormData): Promise<ManageFormState> => {
  const session = await auth();
  if (!session?.courteUserId) redirect('/');

  const venueId = readFormId(formData, 'venueId');
  if (venueId === null) return { error: MALFORMED_ID_ERROR };
  const bookingId = readFormId(formData, 'bookingId');
  if (bookingId === null) return { error: MALFORMED_ID_ERROR };

  try {
    await markNoShowRequest(session.courteUserId, venueId, { bookingId });
  } catch (error) {
    if (error instanceof ApiError) return { error: error.toFormMessage() };
    throw error;
  }

  revalidatePath(`/manage/${venueId}`);
  return { ok: true };
};

export const recordPayment = async (_previous: ManageFormState, formData: FormData): Promise<ManageFormState> => {
  const session = await auth();
  if (!session?.courteUserId) redirect('/');

  const venueId = readFormId(formData, 'venueId');

  if (venueId === null) return { error: MALFORMED_ID_ERROR };
  const bookingId = readFormId(formData, 'bookingId');
  if (bookingId === null) return { error: MALFORMED_ID_ERROR };

  try {
    await recordPaymentRequest(session.courteUserId, venueId, {
      bookingId: bookingId,
      amountPesos: Number(formData.get('amountPesos')),
      method: parsePaymentMethod(formData.get('method')),
    });
  } catch (error) {
    if (error instanceof ApiError) return { error: error.toFormMessage() };
    throw error;
  }

  revalidateVenue(venueId);
  return { ok: true };
};

/**
 * Narrows the form value to the union the contract declares. Deliberately no fallback: a
 * default would record a card payment as cash and the ledger would be quietly wrong. An
 * unrecognised value is a bug or a tampered form, and both deserve the API's 400.
 */
const parsePaymentMethod = (value: FormDataEntryValue | null): PaymentMethod => {
  const method = String(value ?? '');
  if (!PAYMENT_METHODS.includes(method as PaymentMethod)) {
    throw new ApiError(400, {
      code: 'VALIDATION_FAILED',
      message: 'Invalid input',
      errors: [{ field: 'method', message: `must be one of ${PAYMENT_METHODS.join(', ')}` }],
    });
  }
  return method as PaymentMethod;
};
