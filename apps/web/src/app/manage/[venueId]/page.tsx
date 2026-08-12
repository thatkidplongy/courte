import { notFound, redirect } from 'next/navigation';

import type { BookingStatus, VenueBookingRow } from '@courte/contract';

import { auth } from '@/auth';
import { isNotFound } from '@/lib/api/client';
import { fetchVenueDashboard } from '@/lib/api/resources';
import { formatPesos, formatTime } from '@/lib/format';
import { addBlackout, recordPayment, recordWalkIn } from '@/server-actions/manageVenue';

import { BlackoutForm, PaymentForm, WalkInForm } from './components/DeskForms';

const STATUS_STYLES: Record<BookingStatus, string> = {
  confirmed: 'bg-court-100 text-court-800',
  pending: 'bg-amber-100 text-amber-800',
  cancelled: 'bg-neutral-200 text-neutral-500',
  completed: 'bg-neutral-200 text-neutral-600',
  no_show: 'bg-red-100 text-red-700',
};

const SOURCE_LABELS = { online: 'online', phone: 'phone', walk_in: 'walk-in' } as const;

const StatTile = ({ label, value }: { label: string; value: string }) => (
  <div className="card p-6">
    <p className="text-sm font-medium text-neutral-500">{label}</p>
    <p className="mt-2 text-3xl font-extrabold tracking-tight text-neutral-900">{value}</p>
  </div>
);

const BookingRow = ({
  booking,
  venueId,
  timezone,
}: {
  booking: VenueBookingRow;
  venueId: string;
  timezone: string;
}) => {
  const outstandingCents = booking.totalCents - booking.paidCents;
  const playStart = new Date(booking.playStartIso);
  const playEnd = new Date(booking.playEndIso);

  return (
    <li className="flex flex-wrap items-center justify-between gap-4 border-t border-neutral-100 py-4 first:border-t-0">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-neutral-900">{booking.customer}</p>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[booking.status]}`}>
            {booking.status}
          </span>
          <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-500">
            {SOURCE_LABELS[booking.source]}
          </span>
        </div>
        <p className="mt-1 text-sm text-neutral-500">
          {booking.courtName} · {formatTime(playStart, timezone)}–{formatTime(playEnd, timezone)} ·{' '}
          <span className="font-medium text-neutral-700">{formatPesos(booking.totalCents)}</span> · paid{' '}
          {formatPesos(booking.paidCents)}
        </p>
      </div>
      {outstandingCents > 0 ? (
        <PaymentForm
          venueId={venueId}
          bookingId={booking.id}
          outstandingPesos={outstandingCents / 100}
          action={recordPayment}
        />
      ) : (
        <span className="bg-court-100 text-court-800 rounded-full px-3 py-1 text-xs font-semibold">settled</span>
      )}
    </li>
  );
};

const EmptySchedule = () => (
  <p className="py-8 text-center text-sm text-neutral-500">Nothing booked in the next 24 hours.</p>
);

type PageProps = {
  params: Promise<{ venueId: string }>;
};

const ManageVenuePage = async ({ params }: PageProps) => {
  const session = await auth();
  if (!session?.user) redirect('/');

  const { venueId } = await params;

  // One call carrying the stats, the next 24 hours and the court list. Every boundary in it
  // is venue-local, computed by the API from the venue's own timezone.
  const dashboard = await fetchVenueDashboard(session.user.id, venueId).catch(error => {
    if (isNotFound(error)) notFound();
    throw error;
  });

  const { venueTimezone: timezone, stats, bookings } = dashboard;
  const courtOptions = dashboard.courts;

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <p className="text-court-700 text-sm font-medium">For venue owners</p>
      <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-neutral-900">Venue dashboard</h1>

      <div className="mt-7 grid gap-5 sm:grid-cols-3">
        <StatTile label="Bookings today" value={String(stats.bookingsToday)} />
        <StatTile label="Upcoming 7 days" value={String(stats.upcomingWeek)} />
        <StatTile label="Collected this month" value={formatPesos(stats.collectedThisMonthCents)} />
      </div>

      <section className="card mt-8 p-7">
        <h2 className="text-lg font-semibold text-neutral-900">Next 24 hours</h2>
        {bookings.length === 0 ? (
          <EmptySchedule />
        ) : (
          <ul className="mt-4">
            {bookings.map(booking => (
              <BookingRow key={booking.id} booking={booking} venueId={venueId} timezone={timezone} />
            ))}
          </ul>
        )}
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="card p-7">
          <h2 className="text-lg font-semibold text-neutral-900">Record walk-in or phone booking</h2>
          <div className="mt-5">
            <WalkInForm venueId={venueId} courts={courtOptions} action={recordWalkIn} />
          </div>
        </section>

        <section className="card p-7">
          <h2 className="text-lg font-semibold text-neutral-900">Block a court</h2>
          <div className="mt-5">
            <BlackoutForm venueId={venueId} courts={courtOptions} action={addBlackout} />
          </div>
        </section>
      </div>
    </main>
  );
};

export default ManageVenuePage;
