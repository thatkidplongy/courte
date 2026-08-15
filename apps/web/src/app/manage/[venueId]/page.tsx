import { DateTime } from 'luxon';
import { notFound, redirect } from 'next/navigation';

import type { VenueBookingRow } from '@courte/contract';

import { auth } from '@/auth';
import { FieldLabel } from '@/components/atoms/FieldLabel';
import { StatusBadge } from '@/components/atoms/StatusBadge';
import { HourHistogram } from '@/components/molecules/HourHistogram';
import { Panel } from '@/components/molecules/Panel';
import { BOOKING_STATUS_LABELS, BOOKING_STATUS_TONES } from '@/consts';
import { isNotFound } from '@/lib/api/client';
import { fetchVenueDashboard } from '@/lib/api/resources';
import { formatPesos, formatTime } from '@/lib/format';
import { addBlackout, recordPayment, recordWalkIn } from '@/server-actions/manageVenue';

import { BlackoutForm, PaymentForm, WalkInForm } from './components/DeskForms';

const SOURCE_LABELS = { online: 'Online', phone: 'Phone', walk_in: 'Walk-in' } as const;

const StatCard = ({ label, value, note }: { label: string; value: string; note: string }) => (
  <div className="border-border rounded-md border p-[18px]">
    <FieldLabel>{label}</FieldLabel>
    <p className="mt-3 text-[28px] font-extrabold leading-none tracking-tight">{value}</p>
    <p className="text-muted-foreground mt-2.5 text-[11.5px] font-semibold">{note}</p>
  </div>
);

type BookingRowProps = {
  booking: VenueBookingRow;
  venueId: string;
  timezone: string;
};

const BookingRow = ({ booking, venueId, timezone }: BookingRowProps) => {
  const outstandingCents = booking.totalCents - booking.paidCents;
  const playStart = new Date(booking.playStartIso);
  const playEnd = new Date(booking.playEndIso);

  return (
    <tr className="border-border border-t align-middle">
      <td className="px-5 py-4 text-[13px] font-bold">{booking.customer}</td>
      <td className="text-muted-foreground whitespace-nowrap px-5 py-4 text-[13px] font-medium">
        {booking.courtName} · {formatTime(playStart, timezone)}–{formatTime(playEnd, timezone)}
      </td>
      <td className="whitespace-nowrap px-5 py-4 text-[13px] font-bold">{formatPesos(booking.totalCents)}</td>
      <td className="px-5 py-4">
        <StatusBadge tone="neutral">{SOURCE_LABELS[booking.source]}</StatusBadge>
      </td>
      <td className="px-5 py-4">
        <StatusBadge tone={BOOKING_STATUS_TONES[booking.status]}>{BOOKING_STATUS_LABELS[booking.status]}</StatusBadge>
      </td>
      <td className="px-5 py-4">
        {outstandingCents > 0 ? (
          <PaymentForm
            venueId={venueId}
            bookingId={booking.id}
            outstandingPesos={outstandingCents / 100}
            action={recordPayment}
          />
        ) : (
          <StatusBadge tone="positive">Settled</StatusBadge>
        )}
      </td>
    </tr>
  );
};

const TABLE_HEADINGS = ['Player', 'Court & time', 'Amount', 'Source', 'Status', 'Payment'] as const;

type PageProps = {
  params: Promise<{ venueId: string }>;
};

const ManageVenuePage = async ({ params }: PageProps) => {
  const session = await auth();
  if (!session?.user) redirect('/');

  const { venueId } = await params;

  // One call carrying the stats, the next 24 hours, the court list and the utilisation series.
  // Every boundary in it is venue-local, computed by the API from the venue's own timezone.
  const dashboard = await fetchVenueDashboard(session.user.id, venueId).catch(error => {
    if (isNotFound(error)) notFound();
    throw error;
  });

  const { venueTimezone: timezone, stats, bookings, utilisationByHour } = dashboard;
  const courtOptions = dashboard.courts;
  const today = DateTime.now().setZone(timezone);

  return (
    <main className="min-w-0 flex-1 px-5 py-6 lg:px-8">
      <div className="border-ink flex flex-wrap items-end justify-between gap-4 border-b-2 pb-5">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight">Overview</h1>
          <p className="text-muted-foreground mt-2 text-[12.5px] font-medium">
            {today.toFormat('cccc, d LLLL yyyy')} · next 24 hours
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Bookings today" value={String(stats.bookingsToday)} note="Play starting today" />
        <StatCard label="Upcoming 7 days" value={String(stats.upcomingWeek)} note="Confirmed and pending" />
        <StatCard
          label="Collected this month"
          value={formatPesos(stats.collectedThisMonthCents)}
          note="Payments less refunds"
        />
      </div>

      <Panel className="mt-6" title="Busiest hours" description="Bookings by hour of day, last 30 days">
        <HourHistogram bars={utilisationByHour} />
      </Panel>

      {/* Not a Panel: the table's header row and its own rules run edge to edge, so the
            surface cannot carry the padding a Panel puts on everything inside it. */}
      <section className="border-border mt-6 overflow-hidden rounded-md border">
        <div className="border-ink flex items-center justify-between border-b-2 px-5 py-4">
          <h2 className="text-[15px] font-extrabold tracking-tight">Next 24 hours</h2>
          <span className="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.08em]">
            {bookings.length} {bookings.length === 1 ? 'booking' : 'bookings'}
          </span>
        </div>

        {bookings.length === 0 ? (
          <p className="text-muted-foreground px-5 py-8 text-sm">Nothing booked in the next 24 hours.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted">
                  {TABLE_HEADINGS.map(heading => (
                    <th
                      key={heading}
                      className="text-muted-foreground whitespace-nowrap px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em]"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bookings.map(booking => (
                  <BookingRow key={booking.id} booking={booking} venueId={venueId} timezone={timezone} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Record walk-in or phone booking">
          <WalkInForm venueId={venueId} courts={courtOptions} action={recordWalkIn} />
        </Panel>

        <Panel title="Block a court">
          <BlackoutForm venueId={venueId} courts={courtOptions} action={addBlackout} />
        </Panel>
      </div>
    </main>
  );
};

export default ManageVenuePage;
