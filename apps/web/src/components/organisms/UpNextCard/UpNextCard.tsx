import { DateTime } from 'luxon';

import type { BookingSummary } from '@courte/contract';

import { formatTime } from '@/lib/format';
import { cn } from '@/lib/utils';

type UpNextCardProps = {
  booking: BookingSummary;
  className?: string;
};

/**
 * Describes when the game is in the words someone would use — "in 2 hrs", "tomorrow" — because
 * that is what the reader wants from this card. The exact time is on the line below it.
 */
const toWhenLabel = (booking: BookingSummary, now: number): string => {
  const start = DateTime.fromISO(booking.playStartIso).setZone(booking.venueTimezone);
  const nowLocal = DateTime.fromMillis(now).setZone(booking.venueTimezone);
  const hoursAway = start.diff(nowLocal, 'hours').hours;

  if (hoursAway < 0) return 'On now';
  if (hoursAway < 1) return 'Starting soon';
  if (start.hasSame(nowLocal, 'day')) return `In ${Math.round(hoursAway)} hrs`;
  if (start.hasSame(nowLocal.plus({ days: 1 }), 'day')) return 'Tomorrow';
  return start.toFormat('ccc d LLL');
};

/**
 * The night card the phone home screen opens with. It is the one place in the app that answers
 * "where am I playing next" without the reader navigating anywhere, so it earns the dark ground
 * — it is the only element on a white page allowed to shout.
 */
export const UpNextCard = ({ booking, className }: UpNextCardProps) => {
  const start = new Date(booking.playStartIso);
  const end = new Date(booking.playEndIso);

  return (
    <section className={cn('bg-night rounded-md p-4 text-white sm:p-5', className)}>
      <p className="text-primary text-[9.5px] font-semibold uppercase tracking-[0.14em]">
        Up next · {toWhenLabel(booking, Date.now())}
      </p>
      <p className="mt-2.5 text-[17px] font-extrabold leading-tight">{booking.venueName}</p>
      <p className="mt-2 text-xs font-medium text-white/65">
        {booking.courtNames.join(', ')} · {formatTime(start, booking.venueTimezone)}–
        {formatTime(end, booking.venueTimezone)}
      </p>
    </section>
  );
};
