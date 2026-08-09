import { CancellationWindowPassedError } from '@/domain/errors';

/**
 * A venue's cancellation window counts back from first play, not from when the player asks:
 * a 24-hour window means "free cancellation until 24 hours before the booking starts".
 * Staff acting for the venue bypass the window — the venue is waiving its own policy.
 */

export type CancellationPolicyParams = {
  bookingStart: Date;
  cancellationWindowMinutes: number;
  now: Date;
  isVenueStaff: boolean;
};

export const assertCancellable = (params: CancellationPolicyParams): void => {
  if (params.isVenueStaff) return;

  const deadline = new Date(params.bookingStart.getTime() - params.cancellationWindowMinutes * 60_000);
  if (params.now >= deadline) {
    throw new CancellationWindowPassedError();
  }
};
