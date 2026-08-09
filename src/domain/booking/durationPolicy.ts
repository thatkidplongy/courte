import { InvalidDurationError } from '@/domain/errors';

export type DurationRules = {
  minDurationMinutes: number;
  maxDurationMinutes: number;
  incrementMinutes: number;
};

/** One definition of "this court accepts that duration", shared by every booking path. */
export const assertDurationAllowed = (court: DurationRules, durationMinutes: number): void => {
  const isAllowed =
    durationMinutes >= court.minDurationMinutes &&
    durationMinutes <= court.maxDurationMinutes &&
    durationMinutes % court.incrementMinutes === 0;

  if (!isAllowed) {
    throw new InvalidDurationError(
      `This court takes bookings of ${court.minDurationMinutes}–${court.maxDurationMinutes} minutes in steps of ${court.incrementMinutes}`
    );
  }
};
