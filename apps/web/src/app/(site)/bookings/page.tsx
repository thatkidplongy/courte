import { DateTime } from 'luxon';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import type { BookingSummary, WaitlistEntry } from '@courte/contract';

import { auth } from '@/auth';
import { StatusBadge } from '@/components/atoms/StatusBadge';
import { EmptyState } from '@/components/molecules/EmptyState';
import { PageHeader } from '@/components/molecules/PageHeader';
import { Panel } from '@/components/molecules/Panel';
import { SegmentedControl } from '@/components/molecules/SegmentedControl';
import { UpNextCard } from '@/components/organisms/UpNextCard';
import {
  BOOKING_PERIOD_LABELS,
  BOOKING_STATUS_LABELS,
  BOOKING_STATUS_TONES,
  PAYMENT_STATE_LABELS,
  PAYMENT_STATE_TONES,
} from '@/consts';
import { fetchBookings, fetchWaitlistEntries } from '@/lib/api/resources';
import { BOOKING_PERIODS, filterBookingsByPeriod, findNextBooking, isBookingPeriod } from '@/lib/bookings';
import type { BookingPeriod } from '@/lib/bookings';
import { formatDay, formatPesos, formatTime } from '@/lib/format';
import { cancelBooking } from '@/server-actions/cancelBooking';

import { CancelForm } from './components/CancelForm';

/** The court page reads its day in venue-local time, so a link must carry it that way. */
const toDateParam = (moment: Date, timezone: string): string =>
  DateTime.fromJSDate(moment).setZone(timezone).toFormat('yyyy-MM-dd');

/**
 * The date block: an ink square carrying the day and month. It is the one place the list gives
 * the eye something to scan down, which is what makes a stack of otherwise identical rows
 * readable at a glance.
 */
const DateBlock = ({ booking }: { booking: BookingSummary }) => {
  const local = DateTime.fromISO(booking.playStartIso).setZone(booking.venueTimezone);

  return (
    <div className="bg-night flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-md text-white">
      <span className="text-xl font-extrabold leading-none">{local.toFormat('d')}</span>
      <span className="text-primary mt-1.5 text-[10px] font-bold uppercase tracking-[0.12em]">
        {local.toFormat('LLL')}
      </span>
    </div>
  );
};

const BookingRow = ({ booking }: { booking: BookingSummary }) => {
  const isCancellable = booking.status === 'confirmed' || booking.status === 'pending';
  const playStart = new Date(booking.playStartIso);
  const playEnd = new Date(booking.playEndIso);

  return (
    <li className="border-border flex flex-wrap items-center gap-4 rounded-md border p-4 sm:gap-5 sm:p-5">
      <DateBlock booking={booking} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <p className="font-bold">{booking.venueName}</p>
          <StatusBadge tone={BOOKING_STATUS_TONES[booking.status]}>{BOOKING_STATUS_LABELS[booking.status]}</StatusBadge>
        </div>
        <p className="text-muted-foreground mt-1.5 text-[13px] font-medium">
          {booking.courtNames.join(', ')} · {formatTime(playStart, booking.venueTimezone)}–
          {formatTime(playEnd, booking.venueTimezone)}
        </p>
        <div className="mt-2.5 flex items-center gap-2.5">
          <span className="text-lg font-extrabold leading-none tracking-tight">{formatPesos(booking.totalCents)}</span>
          <StatusBadge tone={PAYMENT_STATE_TONES[booking.paymentState]}>
            {PAYMENT_STATE_LABELS[booking.paymentState]}
          </StatusBadge>
        </div>
      </div>
      {/* Full width on a phone so the cancel drops to its own line instead of squeezing the
          venue name into two words per row. */}
      {isCancellable ? (
        <div className="w-full sm:w-auto">
          <CancelForm bookingId={booking.id} action={cancelBooking} />
        </div>
      ) : null}
    </li>
  );
};

const WaitlistRow = ({ entry }: { entry: WaitlistEntry }) => {
  const offeredStart = entry.offeredStartIso ? new Date(entry.offeredStartIso) : null;
  const claimExpiresAt = entry.claimExpiresAtIso ? new Date(entry.claimExpiresAtIso) : null;
  const hasLiveOffer = entry.state === 'offered' && offeredStart !== null && entry.offeredCourtId !== null;
  const desiredStart = new Date(entry.desiredStartIso);
  const desiredEnd = new Date(entry.desiredEndIso);

  return (
    <li className="border-border flex flex-wrap items-center justify-between gap-4 rounded-md border p-5">
      <div>
        <div className="flex items-center gap-2.5">
          <p className="font-bold">{entry.venueName}</p>
          <StatusBadge tone={hasLiveOffer ? 'positive' : 'neutral'}>
            {hasLiveOffer ? 'Slot open' : 'Waiting'}
          </StatusBadge>
        </div>
        <p className="text-muted-foreground mt-1.5 text-[13px] font-medium">
          {entry.courtName} · {formatDay(desiredStart, entry.venueTimezone)} ·{' '}
          {formatTime(desiredStart, entry.venueTimezone)}–{formatTime(desiredEnd, entry.venueTimezone)}
        </p>
        {hasLiveOffer && claimExpiresAt ? (
          <p className="text-brand-700 mt-1.5 text-[13px] font-bold">
            {formatTime(offeredStart, entry.venueTimezone)} just opened — claim before{' '}
            {formatTime(claimExpiresAt, entry.venueTimezone)}
          </p>
        ) : null}
      </div>
      {hasLiveOffer && offeredStart && entry.offeredStartIso ? (
        <Link
          href={`/courts/${entry.offeredCourtId}?date=${toDateParam(offeredStart, entry.venueTimezone)}&start=${encodeURIComponent(entry.offeredStartIso)}`}
          className="bg-primary hover:bg-brand-700 rounded-md px-5 py-2.5 text-[13px] font-bold text-white transition"
        >
          Book it now
        </Link>
      ) : null}
    </li>
  );
};

type PageProps = {
  searchParams: Promise<{ period?: string }>;
};

const BookingsPage = async ({ searchParams }: PageProps) => {
  const session = await auth();
  if (!session?.user) redirect('/');

  const { period: rawPeriod } = await searchParams;
  const period: BookingPeriod = isBookingPeriod(rawPeriod) ? rawPeriod : 'upcoming';

  const [bookingPage, waitlistEntries] = await Promise.all([
    fetchBookings(session.user.id),
    fetchWaitlistEntries(session.user.id),
  ]);

  const now = Date.now();
  const allBookings = bookingPage.data;
  const bookings = filterBookingsByPeriod(allBookings, period, now);
  const nextBooking = findNextBooking(allBookings, now);

  const periodSegments = BOOKING_PERIODS.map(value => ({
    value,
    label: BOOKING_PERIOD_LABELS[value],
    href: `/bookings?period=${value}`,
  }));

  return (
    <main className="mx-auto max-w-3xl px-5 py-8 sm:px-6 sm:py-12">
      <PageHeader
        title="My bookings"
        subtitle={`${bookings.length} ${bookings.length === 1 ? 'booking' : 'bookings'}`}
      />

      {nextBooking ? <UpNextCard booking={nextBooking} className="mt-6" /> : null}

      <SegmentedControl label="Booking period" segments={periodSegments} value={period} isFullWidth className="mt-6" />

      {waitlistEntries.length > 0 ? (
        <Panel className="mt-8" title="Waitlist">
          <ul className="flex flex-col gap-4">
            {waitlistEntries.map(entry => (
              <WaitlistRow key={entry.id} entry={entry} />
            ))}
          </ul>
        </Panel>
      ) : null}

      <div className="mt-8">
        {bookings.length === 0 ? (
          <EmptyState
            title={period === 'past' ? 'Nothing played yet' : 'No bookings yet'}
            description={
              period === 'past' ? 'Games you have finished will collect here.' : 'Your next game starts with a search.'
            }
            action={{ href: '/courts', label: 'Find a court' }}
          />
        ) : (
          <ul className="flex flex-col gap-4">
            {bookings.map(booking => (
              <BookingRow key={booking.id} booking={booking} />
            ))}
          </ul>
        )}
      </div>
    </main>
  );
};

export default BookingsPage;
