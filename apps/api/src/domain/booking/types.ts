import type { BookingSource } from '@courte/contract';

/**
 * The dependency surface the booking workflow needs, expressed as types the domain owns.
 * The concrete implementations live in src/db and are injected by the server action or route
 * that calls the service — the domain never imports them (docs/adr/0003), which is also what
 * makes the workflow unit-testable with in-memory fakes.
 */

export type CourtSummary = {
  id: number;
  venueId: number;
  bufferMinutes: number;
};

export type SlotRequest = {
  courtId: number;
  start: Date;
  end: Date;
};

export type Quote = {
  totalCents: number;
  snapshot: Record<string, unknown>;
};

export type BookingRecord = {
  id: number;
  status: string;
  userId: number;
  venueId: number;
};

export type ReleasedReservation = {
  id: number;
  courtId: number;
  duringStart: Date;
  duringEnd: Date;
};

type TransactionClient = unknown;

export type BookingRepositoryPort = {
  insertPendingBooking(
    tx: TransactionClient,
    params: {
      userId: number;
      venueId: number;
      source: BookingSource;
      totalCents: number;
      rateSnapshot: Record<string, unknown>;
    }
  ): Promise<number>;
  findBookingForUser(bookingId: number, userId: number): Promise<BookingRecord | null>;
  updateBookingStatus(tx: TransactionClient, bookingId: number, status: string): Promise<void>;
};

export type ReservationRepositoryPort = {
  insertReservation(
    tx: TransactionClient,
    params: {
      courtId: number;
      bookingId: number;
      kind: 'booking' | 'hold';
      duringStart: Date;
      duringEnd: Date;
      playStart: Date;
      playEnd: Date;
      expiresAt: Date | null;
    }
  ): Promise<number>;
  promoteHoldsToBooking(tx: TransactionClient, bookingId: number): Promise<number>;
  releaseReservationsForBooking(tx: TransactionClient, bookingId: number): Promise<ReleasedReservation[]>;
};

export type BookingWorkflowDeps = {
  bookings: BookingRepositoryPort;
  reservations: ReservationRepositoryPort;
  withTransaction<T>(run: (tx: TransactionClient) => Promise<T>): Promise<T>;
  isOverlapViolation(error: unknown): boolean;
};

export type PlaceHoldParams = {
  userId: number;
  court: CourtSummary;
  slots: SlotRequest[];
  quote: Quote;
  source: BookingSource;
  holdTtlMinutes: number;
  now: Date;
};

export type HoldResult = {
  bookingId: number;
  expiresAt: Date;
};

export type ConfirmBookingParams = {
  bookingId: number;
  userId: number;
};

export type CancelBookingParams = {
  bookingId: number;
  userId: number;
  assertInsideCancellationWindow(booking: BookingRecord): void;
  onReleased(released: ReleasedReservation[]): Promise<void>;
};
