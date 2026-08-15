import { describe, expect, it, vi } from 'vitest';

import { HoldExpiredError, NotFoundError, SlotUnavailableError } from '@/domain/errors';

import { cancelBooking, confirmBooking, placeHold } from './bookingService';
import type { BookingWorkflowDeps, PlaceHoldParams } from './types';

/**
 * Ids are integers. Named constants rather than bare numbers so a failing
 * assertion still says which fixture it means.
 */
const BOOKING_1 = 1;
const U1 = 2;
const V1 = 3;
const C1 = 4;
const R1 = 5;
const C2 = 6;
const INTRUDER = 7;
const RES_1 = 8;

const NOW = new Date('2026-08-10T09:00:00Z');

const buildDeps = (overrides: Partial<BookingWorkflowDeps> = {}): BookingWorkflowDeps => ({
  bookings: {
    insertPendingBooking: vi.fn().mockResolvedValue(BOOKING_1),
    findBookingForUser: vi.fn().mockResolvedValue({ id: BOOKING_1, status: 'pending', userId: U1, venueId: V1 }),
    updateBookingStatus: vi.fn().mockResolvedValue(undefined),
  },
  reservations: {
    insertReservation: vi.fn().mockResolvedValue(RES_1),
    promoteHoldsToBooking: vi.fn().mockResolvedValue(1),
    releaseReservationsForBooking: vi.fn().mockResolvedValue([]),
  },
  withTransaction: vi.fn(async run => run({})),
  isOverlapViolation: vi.fn().mockReturnValue(false),
  ...overrides,
});

const buildHoldParams = (): PlaceHoldParams => ({
  userId: U1,
  court: { id: C1, venueId: V1, bufferMinutes: 15 },
  slots: [{ courtId: C1, start: new Date('2026-08-10T10:00:00Z'), end: new Date('2026-08-10T11:00:00Z') }],
  quote: { totalCents: 45000, snapshot: { ruleId: R1 } },
  source: 'online',
  holdTtlMinutes: 10,
  now: NOW,
});

describe('placeHold', () => {
  it('widens the guarded range by the buffer but keeps the playable range exact', async () => {
    const deps = buildDeps();

    await placeHold(deps, buildHoldParams());

    expect(deps.reservations.insertReservation).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        duringStart: new Date('2026-08-10T09:45:00Z'),
        duringEnd: new Date('2026-08-10T11:15:00Z'),
        playStart: new Date('2026-08-10T10:00:00Z'),
        playEnd: new Date('2026-08-10T11:00:00Z'),
      })
    );
  });

  it('stamps the hold with a TTL-derived expiry', async () => {
    const deps = buildDeps();

    const result = await placeHold(deps, buildHoldParams());

    expect(result.expiresAt).toEqual(new Date('2026-08-10T09:10:00Z'));
  });

  it('maps a constraint rejection to SlotUnavailableError', async () => {
    const constraintError = Object.assign(new Error('conflicting key value'), { code: '23P01' });
    const deps = buildDeps({
      reservations: {
        insertReservation: vi.fn().mockRejectedValue(constraintError),
        promoteHoldsToBooking: vi.fn(),
        releaseReservationsForBooking: vi.fn(),
      },
      isOverlapViolation: vi.fn(error => (error as { code?: string }).code === '23P01'),
    });

    await expect(placeHold(deps, buildHoldParams())).rejects.toBeInstanceOf(SlotUnavailableError);
  });

  it('rethrows anything that is not an overlap untouched', async () => {
    const dbDown = new Error('connection refused');
    const deps = buildDeps({
      reservations: {
        insertReservation: vi.fn().mockRejectedValue(dbDown),
        promoteHoldsToBooking: vi.fn(),
        releaseReservationsForBooking: vi.fn(),
      },
    });

    await expect(placeHold(deps, buildHoldParams())).rejects.toBe(dbDown);
  });

  it('inserts one reservation per requested court', async () => {
    const deps = buildDeps();
    const params = buildHoldParams();
    params.slots = [
      { courtId: C1, start: new Date('2026-08-10T10:00:00Z'), end: new Date('2026-08-10T11:00:00Z') },
      { courtId: C2, start: new Date('2026-08-10T10:00:00Z'), end: new Date('2026-08-10T11:00:00Z') },
    ];

    await placeHold(deps, params);

    expect(deps.reservations.insertReservation).toHaveBeenCalledTimes(2);
  });
});

describe('confirmBooking', () => {
  it('promotes holds and confirms the booking', async () => {
    const deps = buildDeps();

    await confirmBooking(deps, { bookingId: BOOKING_1, userId: U1 });

    expect(deps.reservations.promoteHoldsToBooking).toHaveBeenCalled();
    expect(deps.bookings.updateBookingStatus).toHaveBeenCalledWith(expect.anything(), BOOKING_1, 'confirmed');
  });

  it('kills the booking when the hold already expired', async () => {
    const deps = buildDeps({
      reservations: {
        insertReservation: vi.fn(),
        promoteHoldsToBooking: vi.fn().mockResolvedValue(0),
        releaseReservationsForBooking: vi.fn(),
      },
    });

    await expect(confirmBooking(deps, { bookingId: BOOKING_1, userId: U1 })).rejects.toBeInstanceOf(HoldExpiredError);
    expect(deps.bookings.updateBookingStatus).toHaveBeenCalledWith(expect.anything(), BOOKING_1, 'cancelled');
  });

  it('reports not-found for a booking the user does not own', async () => {
    const deps = buildDeps({
      bookings: {
        insertPendingBooking: vi.fn(),
        findBookingForUser: vi.fn().mockResolvedValue(null),
        updateBookingStatus: vi.fn(),
      },
    });

    await expect(confirmBooking(deps, { bookingId: BOOKING_1, userId: INTRUDER })).rejects.toBeInstanceOf(
      NotFoundError
    );
  });
});

describe('cancelBooking', () => {
  it('releases reservations and notifies the waitlist after commit', async () => {
    const released = [
      {
        id: RES_1,
        courtId: C1,
        duringStart: new Date('2026-08-10T10:00:00Z'),
        duringEnd: new Date('2026-08-10T11:00:00Z'),
      },
    ];
    const onReleased = vi.fn().mockResolvedValue(undefined);
    const deps = buildDeps({
      bookings: {
        insertPendingBooking: vi.fn(),
        findBookingForUser: vi.fn().mockResolvedValue({ id: BOOKING_1, status: 'confirmed', userId: U1, venueId: V1 }),
        updateBookingStatus: vi.fn(),
      },
      reservations: {
        insertReservation: vi.fn(),
        promoteHoldsToBooking: vi.fn(),
        releaseReservationsForBooking: vi.fn().mockResolvedValue(released),
      },
    });

    await cancelBooking(deps, {
      bookingId: BOOKING_1,
      userId: U1,
      assertInsideCancellationWindow: vi.fn(),
      onReleased,
    });

    expect(onReleased).toHaveBeenCalledWith(released);
  });

  it('propagates the cancellation-window rejection without touching the booking', async () => {
    const windowError = new Error('inside window');
    const deps = buildDeps({
      bookings: {
        insertPendingBooking: vi.fn(),
        findBookingForUser: vi.fn().mockResolvedValue({ id: BOOKING_1, status: 'confirmed', userId: U1, venueId: V1 }),
        updateBookingStatus: vi.fn(),
      },
    });

    await expect(
      cancelBooking(deps, {
        bookingId: BOOKING_1,
        userId: U1,
        assertInsideCancellationWindow: () => {
          throw windowError;
        },
        onReleased: vi.fn(),
      })
    ).rejects.toBe(windowError);

    expect(deps.bookings.updateBookingStatus).not.toHaveBeenCalled();
  });
});
