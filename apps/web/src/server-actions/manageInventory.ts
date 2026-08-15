'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { COURT_SURFACES, SPORTS, type CourtSurface, type Sport } from '@courte/contract';

import { auth } from '@/auth';
import { ApiError } from '@/lib/api/client';
import {
  archiveCourt as archiveCourtRequest,
  createCourt as createCourtRequest,
  createPriceRule as createPriceRuleRequest,
  deletePriceRule as deletePriceRuleRequest,
  replaceOpeningWindows as replaceOpeningWindowsRequest,
  restoreCourt as restoreCourtRequest,
} from '@/lib/api/resources';
import type { ManageFormState } from '@/server-actions/manageVenue';

/**
 * Inventory: what the venue sells and what it costs. Every one of these is owner-only, checked
 * by the API rather than here — this layer knows who the caller is, not what they may do.
 *
 * A blank field means "no restriction", which is why every optional value is normalised to null
 * rather than to an empty string. `startsAt: ''` would be a time nobody can parse; `null` is a
 * rule that applies at any hour, and that is the difference between the two.
 */

const optionalText = (value: FormDataEntryValue | null): string | null => {
  const text = String(value ?? '').trim();
  return text === '' ? null : text;
};

const optionalNumber = (value: FormDataEntryValue | null): number | null => {
  const text = optionalText(value);
  return text === null ? null : Number(text);
};

const isSport = (value: string): value is Sport => SPORTS.includes(value as Sport);
const isSurface = (value: string): value is CourtSurface => COURT_SURFACES.includes(value as CourtSurface);

const revalidateInventory = (venueId: string, courtId?: string): void => {
  revalidatePath(`/manage/${venueId}/courts`);
  // The public grid prices every hour from these rules, so it must not keep serving the old ones.
  if (courtId) {
    revalidatePath(`/manage/${venueId}/courts/${courtId}/pricing`);
    revalidatePath(`/courts/${courtId}`);
  }
};

export const createCourt = async (_previous: ManageFormState, formData: FormData): Promise<ManageFormState> => {
  const session = await auth();
  if (!session?.user) redirect('/');

  const venueId = String(formData.get('venueId') ?? '');
  const sport = String(formData.get('sport') ?? '');
  const surface = String(formData.get('surface') ?? '');

  if (!isSport(sport)) return { error: 'Choose a sport' };
  if (!isSurface(surface)) return { error: 'Choose a surface' };

  try {
    await createCourtRequest(session.user.id, venueId, {
      name: String(formData.get('name') ?? ''),
      sport,
      surface,
      minDurationMinutes: Number(formData.get('minDurationMinutes')),
      maxDurationMinutes: Number(formData.get('maxDurationMinutes')),
      incrementMinutes: Number(formData.get('incrementMinutes')),
      bufferMinutes: Number(formData.get('bufferMinutes')),
    });
  } catch (error) {
    if (error instanceof ApiError) return { error: error.toFormMessage() };
    throw error;
  }

  revalidateInventory(venueId);
  return { ok: true };
};

/**
 * Archiving and restoring are one action with a direction, because the button that does them is
 * one button whose label flips. The API keeps them as separate routes; the form does not need to.
 */
export const setCourtArchived = async (_previous: ManageFormState, formData: FormData): Promise<ManageFormState> => {
  const session = await auth();
  if (!session?.user) redirect('/');

  const venueId = String(formData.get('venueId') ?? '');
  const courtId = String(formData.get('courtId') ?? '');
  const shouldArchive = formData.get('isArchived') !== 'true';

  try {
    await (shouldArchive
      ? archiveCourtRequest(session.user.id, venueId, courtId)
      : restoreCourtRequest(session.user.id, venueId, courtId));
  } catch (error) {
    if (error instanceof ApiError) return { error: error.toFormMessage() };
    throw error;
  }

  revalidateInventory(venueId, courtId);
  return { ok: true };
};

export const createPriceRule = async (_previous: ManageFormState, formData: FormData): Promise<ManageFormState> => {
  const session = await auth();
  if (!session?.user) redirect('/');

  const venueId = String(formData.get('venueId') ?? '');
  const courtId = String(formData.get('courtId') ?? '');
  const pesos = Number(formData.get('ratePerHourPesos'));

  if (!Number.isFinite(pesos) || pesos < 0) return { error: 'Enter a rate' };

  try {
    await createPriceRuleRequest(session.user.id, venueId, courtId, {
      priority: Number(formData.get('priority') ?? 0),
      dayOfWeek: optionalNumber(formData.get('dayOfWeek')),
      startsAt: optionalText(formData.get('startsAt')),
      endsAt: optionalText(formData.get('endsAt')),
      validFrom: optionalText(formData.get('validFrom')),
      validTo: optionalText(formData.get('validTo')),
      // Member-only rates are deliberately not offered: `isMember` is false at every call
      // site until venue passes exist, so such a rule could never fire. See BACKEND_PLAN M5b.
      memberOnly: false,
      ratePerHourCents: Math.round(pesos * 100),
    });
  } catch (error) {
    if (error instanceof ApiError) return { error: error.toFormMessage() };
    throw error;
  }

  revalidateInventory(venueId, courtId);
  return { ok: true };
};

export const deletePriceRule = async (_previous: ManageFormState, formData: FormData): Promise<ManageFormState> => {
  const session = await auth();
  if (!session?.user) redirect('/');

  const venueId = String(formData.get('venueId') ?? '');
  const courtId = String(formData.get('courtId') ?? '');

  try {
    await deletePriceRuleRequest(session.user.id, venueId, courtId, String(formData.get('ruleId') ?? ''));
  } catch (error) {
    if (error instanceof ApiError) return { error: error.toFormMessage() };
    throw error;
  }

  revalidateInventory(venueId, courtId);
  return { ok: true };
};

/**
 * The whole week in one submit. Days left blank are closed days, which is how a venue that
 * shuts on Sundays is expressed — an absent window, not a zero-length one.
 */
export const replaceOpeningWindows = async (
  _previous: ManageFormState,
  formData: FormData
): Promise<ManageFormState> => {
  const session = await auth();
  if (!session?.user) redirect('/');

  const venueId = String(formData.get('venueId') ?? '');
  const courtId = String(formData.get('courtId') ?? '');

  const windows = [0, 1, 2, 3, 4, 5, 6].flatMap(day => {
    if (formData.get(`open-${day}`) !== 'on') return [];

    const startsAt = optionalText(formData.get(`startsAt-${day}`));
    const durationMinutes = optionalNumber(formData.get(`durationMinutes-${day}`));
    if (startsAt === null || durationMinutes === null) return [];

    return [{ dayOfWeek: day, startsAt, durationMinutes }];
  });

  try {
    await replaceOpeningWindowsRequest(session.user.id, venueId, courtId, { windows });
  } catch (error) {
    if (error instanceof ApiError) return { error: error.toFormMessage() };
    throw error;
  }

  revalidateInventory(venueId, courtId);
  return { ok: true };
};
