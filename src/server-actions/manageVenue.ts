'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { auth } from '@/auth';
import { findCourtById } from '@/db/repositories/courtRepository';
import { membershipReader } from '@/db/repositories/membershipRepository';
import { findPriceRulesForCourts } from '@/db/repositories/priceRuleRepository';
import { findVenueTimezones } from '@/db/repositories/venueRepository';
import {
  insertBlackout,
  insertVenuePayment,
  insertWalkInBooking,
} from '@/db/repositories/venueDashboardRepository';
import { requireVenueAction } from '@/domain/authz/venueAccess';
import { DomainError, NotFoundError } from '@/domain/errors';
import { resolveQuote } from '@/domain/pricing/resolveQuote';
import { formatDomainError, idSchema, parseInput } from '@/lib/validation';

export type ManageFormState = {
  error?: string;
  ok?: boolean;
};

/**
 * Desk operations. Every action re-checks venue membership inside itself via
 * requireVenueAction — gate three of three; the manage layout's check (gate two) protects
 * pages, never mutations.
 */

const walkInSchema = z.object({
  venueId: idSchema,
  courtId: idSchema,
  customerName: z.string().trim().min(1, 'Customer name is required').max(120),
  startIso: z.iso.datetime({ offset: true }),
  durationMinutes: z.coerce.number().int().min(15).max(480),
  source: z.enum(['walk_in', 'phone']),
});

export const recordWalkIn = async (_previous: ManageFormState, formData: FormData): Promise<ManageFormState> => {
  const session = await auth();
  if (!session?.user) redirect('/');

  let venuePath: string;

  try {
    const input = parseInput(walkInSchema, {
      venueId: formData.get('venueId'),
      courtId: formData.get('courtId'),
      customerName: formData.get('customerName'),
      startIso: formData.get('startIso'),
      durationMinutes: formData.get('durationMinutes'),
      source: formData.get('source'),
    });

    const membership = await requireVenueAction(membershipReader, session.user.id, input.venueId, 'recordWalkIn');

    const court = await findCourtById(input.courtId);
    // A court id from another venue is indistinguishable from a missing one.
    if (!court || court.venueId !== input.venueId) throw new NotFoundError('Court');

    const playStart = new Date(input.startIso);
    const playEnd = new Date(playStart.getTime() + input.durationMinutes * 60_000);

    const [rules, timezones] = await Promise.all([
      findPriceRulesForCourts([court.id]),
      findVenueTimezones([court.venueId]),
    ]);
    const timezone = timezones.get(court.venueId);
    if (!timezone) throw new NotFoundError('Venue');

    const quote = resolveQuote({
      rules,
      requested: { start: playStart.getTime(), end: playEnd.getTime() },
      timezone,
      isMember: false,
    });

    const outcome = await insertWalkInBooking({
      venueId: input.venueId,
      courtId: court.id,
      customerName: input.customerName,
      recordedBy: membership.userId,
      source: input.source,
      playStart,
      playEnd,
      bufferMinutes: court.bufferMinutes,
      totalCents: quote.totalCents,
      rateSnapshot: quote.snapshot,
    });

    if (outcome === 'conflict') return { error: 'That court is already taken for that time' };
    venuePath = `/manage/${input.venueId}`;
  } catch (error) {
    if (error instanceof DomainError) return { error: formatDomainError(error) };
    throw error;
  }

  revalidatePath(venuePath);
  return { ok: true };
};

const blackoutSchema = z.object({
  venueId: idSchema,
  courtId: idSchema,
  reason: z.string().trim().min(1, 'A reason is required').max(200),
  startIso: z.iso.datetime({ offset: true }),
  endIso: z.iso.datetime({ offset: true }),
});

export const addBlackout = async (_previous: ManageFormState, formData: FormData): Promise<ManageFormState> => {
  const session = await auth();
  if (!session?.user) redirect('/');

  let venuePath: string;

  try {
    const input = parseInput(blackoutSchema, {
      venueId: formData.get('venueId'),
      courtId: formData.get('courtId'),
      reason: formData.get('reason'),
      startIso: formData.get('startIso'),
      endIso: formData.get('endIso'),
    });

    await requireVenueAction(membershipReader, session.user.id, input.venueId, 'blockCourt');

    const court = await findCourtById(input.courtId);
    if (!court || court.venueId !== input.venueId) throw new NotFoundError('Court');

    const start = new Date(input.startIso);
    const end = new Date(input.endIso);
    if (end <= start) return { error: 'Blackout must end after it starts' };

    const outcome = await insertBlackout({ courtId: court.id, reason: input.reason, start, end });
    if (outcome === 'conflict') {
      return { error: 'Existing bookings overlap that period — cancel or move them first' };
    }
    venuePath = `/manage/${input.venueId}`;
  } catch (error) {
    if (error instanceof DomainError) return { error: formatDomainError(error) };
    throw error;
  }

  revalidatePath(venuePath);
  return { ok: true };
};

const paymentSchema = z.object({
  venueId: idSchema,
  bookingId: idSchema,
  amountPesos: z.coerce.number().positive().max(1_000_000),
  method: z.enum(['cash', 'gcash', 'maya', 'card']),
});

export const recordPayment = async (_previous: ManageFormState, formData: FormData): Promise<ManageFormState> => {
  const session = await auth();
  if (!session?.user) redirect('/');

  let venuePath: string;

  try {
    const input = parseInput(paymentSchema, {
      venueId: formData.get('venueId'),
      bookingId: formData.get('bookingId'),
      amountPesos: formData.get('amountPesos'),
      method: formData.get('method'),
    });

    const membership = await requireVenueAction(membershipReader, session.user.id, input.venueId, 'recordPayment');

    const recorded = await insertVenuePayment({
      bookingId: input.bookingId,
      venueId: input.venueId,
      amountCents: Math.round(input.amountPesos * 100),
      method: input.method,
      recordedBy: membership.userId,
    });

    if (!recorded) throw new NotFoundError('Booking');
    venuePath = `/manage/${input.venueId}`;
  } catch (error) {
    if (error instanceof DomainError) return { error: formatDomainError(error) };
    throw error;
  }

  revalidatePath(venuePath);
  return { ok: true };
};
