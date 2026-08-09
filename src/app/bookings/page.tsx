import Link from 'next/link';
import { redirect } from 'next/navigation';
import { DateTime } from 'luxon';

import type { BookingStatus, PaymentState } from '@/consts';
import { auth } from '@/auth';
import { findBookingDetailsForUser, type BookingDetail } from '@/db/repositories/bookingRepository';
import { findWaitlistEntriesForUser, type UserWaitlistEntry } from '@/db/repositories/waitlistRepository';
import { formatDay, formatPesos, formatTime } from '@/lib/format';
import { cancelBooking } from '@/server-actions/cancelBooking';

import { CancelForm } from './components/CancelForm';

const BOOKINGS_SHOWN = 50;

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

const DateBlock = ({ booking }: { booking: BookingDetail }) => {
  const local = DateTime.fromJSDate(booking.playStart).setZone(booking.venueTimezone);

  return (
    <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-ink-950 text-white">
      <span className="text-xl font-extrabold leading-none">{local.toFormat('d')}</span>
      <span className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-court-400">
        {local.toFormat('LLL')}
      </span>
    </div>
  );
};

const BookingRow = ({ booking }: { booking: BookingDetail }) => {
  const isCancellable = booking.status === 'confirmed' || booking.status === 'pending';

  return (
    <li className="card flex flex-wrap items-center gap-5 p-5">
      <DateBlock booking={booking} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-neutral-900">{booking.venueName}</p>
          <StatusBadge status={booking.status} />
        </div>
        <p className="mt-1 text-sm text-neutral-500">
          {booking.courtNames.join(', ')} · {formatTime(booking.playStart, booking.venueTimezone)}–
          {formatTime(booking.playEnd, booking.venueTimezone)}
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

const WaitlistRow = ({ entry }: { entry: UserWaitlistEntry }) => {
  const hasLiveOffer = entry.state === 'offered' && entry.offeredStart && entry.offeredCourtId;

  return (
    <li className="card flex flex-wrap items-center justify-between gap-4 p-5">
      <div>
        <div className="flex items-center gap-2">
          <p className="font-semibold text-neutral-900">{entry.venueName}</p>
          {hasLiveOffer ? (
            <span className="rounded-full bg-court-500 px-2.5 py-1 text-xs font-bold text-white">slot open!</span>
          ) : (
            <span className="rounded-full bg-neutral-200 px-2.5 py-1 text-xs font-semibold text-neutral-500">
              waiting
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-neutral-500">
          {entry.courtName} · {formatDay(entry.desiredStart, entry.venueTimezone)} ·{' '}
          {formatTime(entry.desiredStart, entry.venueTimezone)}–{formatTime(entry.desiredEnd, entry.venueTimezone)}
        </p>
        {hasLiveOffer && entry.claimExpiresAt ? (
          <p className="mt-0.5 text-sm font-medium text-court-700">
            {formatTime(entry.offeredStart!, entry.venueTimezone)} just opened — claim before{' '}
            {formatTime(entry.claimExpiresAt, entry.venueTimezone)}
          </p>
        ) : null}
      </div>
      {hasLiveOffer ? (
        <Link
          href={`/courts/${entry.offeredCourtId}?date=${formatDateParam(entry)}&start=${entry.offeredStart!.getTime()}`}
          className="btn-primary"
        >
          Book it now
        </Link>
      ) : null}
    </li>
  );
};

const formatDateParam = (entry: UserWaitlistEntry): string =>
  DateTime.fromJSDate(entry.offeredStart ?? entry.desiredStart)
    .setZone(entry.venueTimezone)
    .toFormat('yyyy-MM-dd');

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

  const [bookings, waitlistEntries] = await Promise.all([
    findBookingDetailsForUser(session.user.id, BOOKINGS_SHOWN),
    findWaitlistEntriesForUser(session.user.id),
  ]);

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
