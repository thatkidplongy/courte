import type { BookingSource } from '@courte/contract';

/**
 * The dependency surface the booking workflow needs, expressed as types the domain owns.
 * The concrete implementations live in src/db and are injected by the server action or route
 * that calls the service — the domain never imports them (docs/adr/0003), which is also what
 * makes the workflow unit-testable with in-memory fakes.
 */

export type CourtSummary = {
  id: string;
  venueId: string;
  bufferMinutes: number;
};

export type SlotRequest = {
  courtId: string;
  start: Date;
  end: Date;
};

export type Quote = {
  totalCents: number;
  snapshot: Record<string, unknown>;
};

export type BookingRecord = {
  id: string;
  status: string;
  userId: string;
  venueId: string;
};

export type ReleasedReservation = {
  id: string;
  courtId: string;
  duringStart: Date;
  duringEnd: Date;
};

type TransactionClient = unknown;

export type BookingRepositoryPort = {
  insertPendingBooking(
    tx: TransactionClient,
    params: {
      userId: string;
      venueId: string;
      source: BookingSource;
      totalCents: number;
      rateSnapshot: Record<string, unknown>;
    }
  ): Promise<string>;
  findBookingForUser(bookingId: string, userId: string): Promise<BookingRecord | null>;
  updateBookingStatus(tx: TransactionClient, bookingId: string, status: string): Promise<void>;
};

export type ReservationRepositoryPort = {
  insertReservation(
    tx: TransactionClient,
    params: {
      courtId: string;
      bookingId: string;
      kind: 'booking' | 'hold';
      duringStart: Date;
      duringEnd: Date;
      playStart: Date;
      playEnd: Date;
      expiresAt: Date | null;
    }
  ): Promise<string>;
  promoteHoldsToBooking(tx: TransactionClient, bookingId: string): Promise<number>;
  releaseReservationsForBooking(tx: TransactionClient, bookingId: string): Promise<ReleasedReservation[]>;
};

export type BookingWorkflowDeps = {
  bookings: BookingRepositoryPort;
  reservations: ReservationRepositoryPort;
  withTransaction<T>(run: (tx: TransactionClient) => Promise<T>): Promise<T>;
  isOverlapViolation(error: unknown): boolean;
};

export type PlaceHoldParams = {
  userId: string;
  court: CourtSummary;
  slots: SlotRequest[];
  quote: Quote;
  source: BookingSource;
  holdTtlMinutes: number;
  now: Date;
};

export type HoldResult = {
  bookingId: string;
  expiresAt: Date;
};

export type ConfirmBookingParams = {
  bookingId: string;
  userId: string;
};

export type CancelBookingParams = {
  bookingId: string;
  userId: string;
  assertInsideCancellationWindow(booking: BookingRecord): void;
  onReleased(released: ReleasedReservation[]): Promise<void>;
};
