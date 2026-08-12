import { DateTime } from 'luxon';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import type { BookingStatus, BookingSummary, PaymentState, WaitlistEntry } from '@courte/contract';

import { auth } from '@/auth';
import { fetchBookings, fetchWaitlistEntries } from '@/lib/api/resources';
import { formatDay, formatPesos, formatTime } from '@/lib/format';
import { cancelBooking } from '@/server-actions/cancelBooking';

import { CancelForm } from './components/CancelForm';

const STATUS_STYLES: Record<BookingStatus, string> = {
  confirmed: 'bg-court-100 text-court-800',
  pending: 'bg-amber-100 text-amber-800',
  cancelled: 'bg-neutral-200 text-neutral-500',
  completed: 'bg-neutral-200 text-neutral-600',
  no_show: 'bg-red-100 text-red-700',
};

const PAYMENT_STYLES: Record<PaymentState, string> = {
  unpaid: 'text-neutral-500',
  partial: 'text-amber-700',
  paid: 'text-court-700',
};

const PAYMENT_LABELS: Record<PaymentState, string> = {
  unpaid: 'unpaid',
  partial: 'partially paid',
  paid: 'paid',
};

const StatusBadge = ({ status }: { status: BookingStatus }) => (
  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[status]}`}>
    {status.replace('_', ' ')}
  </span>
);

const DateBlock = ({ booking }: { booking: BookingSummary }) => {
  const local = DateTime.fromISO(booking.playStartIso).setZone(booking.venueTimezone);

  return (
    <div className="bg-ink-950 flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl text-white">
      <span className="text-xl font-extrabold leading-none">{local.toFormat('d')}</span>
      <span className="text-court-400 mt-1 text-[11px] font-semibold uppercase tracking-wide">
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
    <li className="card flex flex-wrap items-center gap-5 p-5">
      <DateBlock booking={booking} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-neutral-900">{booking.venueName}</p>
          <StatusBadge status={booking.status} />
        </div>
        <p className="mt-1 text-sm text-neutral-500">
          {booking.courtNames.join(', ')} · {formatTime(playStart, booking.venueTimezone)}–
          {formatTime(playEnd, booking.venueTimezone)}
        </p>
        <p className="mt-0.5 text-sm">
          <span className="font-semibold text-neutral-900">{formatPesos(booking.totalCents)}</span>{' '}
          <span className={`font-medium ${PAYMENT_STYLES[booking.paymentState]}`}>
            · {PAYMENT_LABELS[booking.paymentState]}
          </span>
        </p>
      </div>
      {isCancellable ? <CancelForm bookingId={booking.id} action={cancelBooking} /> : null}
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
    <li className="card flex flex-wrap items-center justify-between gap-4 p-5">
      <div>
        <div className="flex items-center gap-2">
          <p className="font-semibold text-neutral-900">{entry.venueName}</p>
          {hasLiveOffer ? (
            <span className="bg-court-500 rounded-full px-2.5 py-1 text-xs font-bold text-white">slot open!</span>
          ) : (
            <span className="rounded-full bg-neutral-200 px-2.5 py-1 text-xs font-semibold text-neutral-500">
              waiting
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-neutral-500">
          {entry.courtName} · {formatDay(desiredStart, entry.venueTimezone)} ·{' '}
          {formatTime(desiredStart, entry.venueTimezone)}–{formatTime(desiredEnd, entry.venueTimezone)}
        </p>
        {hasLiveOffer && claimExpiresAt ? (
          <p className="text-court-700 mt-0.5 text-sm font-medium">
            {formatTime(offeredStart, entry.venueTimezone)} just opened — claim before{' '}
            {formatTime(claimExpiresAt, entry.venueTimezone)}
          </p>
        ) : null}
      </div>
      {hasLiveOffer ? (
        <Link
          href={`/courts/${entry.offeredCourtId}?date=${toDateParam(offeredStart, entry.venueTimezone)}&start=${encodeURIComponent(entry.offeredStartIso!)}`}
          className="btn-primary"
        >
          Book it now
        </Link>
      ) : null}
    </li>
  );
};

/** The court page reads its day in venue-local time, so the link must carry it that way. */
const toDateParam = (moment: Date, timezone: string): string =>
  DateTime.fromJSDate(moment).setZone(timezone).toFormat('yyyy-MM-dd');

const EmptyState = () => (
  <div className="card p-14 text-center">
    <p className="text-lg font-medium text-neutral-700">No bookings yet</p>
    <p className="mt-1 text-sm text-neutral-500">Your next game starts with a search.</p>
    <Link href="/" className="btn-primary mt-6">
      Find a court
    </Link>
  </div>
);

const BookingsPage = async () => {
  const session = await auth();
  if (!session?.user) redirect('/');

  const [bookingPage, waitlistEntries] = await Promise.all([
    fetchBookings(session.user.id),
    fetchWaitlistEntries(session.user.id),
  ]);
  const bookings = bookingPage.data;

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900">My bookings</h1>

      {waitlistEntries.length > 0 ? (
        <section className="mt-7">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Waitlist</h2>
          <ul className="mt-3 flex flex-col gap-4">
            {waitlistEntries.map(entry => (
              <WaitlistRow key={entry.id} entry={entry} />
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-7">
        {bookings.length === 0 ? (
          <EmptyState />
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
