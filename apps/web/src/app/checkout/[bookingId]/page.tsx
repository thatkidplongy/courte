import { notFound, redirect } from 'next/navigation';

import { auth } from '@/auth';
import { FieldLabel } from '@/components/atoms/FieldLabel';
import { fetchBooking } from '@/lib/api';
import { isNotFound } from '@/lib/api/client';
import { formatDay, formatPesos, formatTime } from '@/lib/format';
import { parseRouteId } from '@/lib/ids';
import { confirmBooking } from '@/server-actions/confirmBooking';

import { ConfirmPanel } from './components/ConfirmPanel';

type PageProps = {
  params: Promise<{ bookingId: string }>;
};

const SummaryRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-baseline justify-between gap-4">
    <dt className="text-muted-foreground text-[13px]">{label}</dt>
    <dd className="text-[13px] font-bold">{value}</dd>
  </div>
);

const CheckoutPage = async ({ params }: PageProps) => {
  const session = await auth();
  if (!session?.courteUserId) redirect('/');

  const routeParams = await params;

  const bookingId = parseRouteId(routeParams.bookingId);

  if (bookingId === null) notFound();

  const booking = await fetchBooking(session.courteUserId, bookingId).catch(error => {
    // Someone else's booking id returns 404 from the API, exactly as a fabricated one does.
    if (isNotFound(error)) notFound();
    throw error;
  });

  // Only a live pending hold has a checkout; anything else 404s rather than explaining itself.
  if (booking.status !== 'pending' || !booking.holdExpiresAtIso) notFound();

  const playStart = new Date(booking.playStartIso);
  const playEnd = new Date(booking.playEndIso);

  return (
    <main className="mx-auto max-w-md px-6 py-14">
      <FieldLabel className="text-primary">Step 2 of 2 · Confirm</FieldLabel>
      <h1 className="mt-2.5 text-4xl font-extrabold leading-[1.05] tracking-tight">Almost there.</h1>
      <p className="text-muted-foreground mt-3 text-sm">Confirm within the hold window and it&apos;s yours.</p>

      <div className="border-ink mt-8 rounded-md border-2">
        <div className="border-border border-b p-6">
          <p className="text-lg font-extrabold tracking-tight">{booking.venueName}</p>
          <p className="text-muted-foreground mt-1 text-[13px] font-medium">{booking.courtNames.join(', ')}</p>
        </div>

        <div className="p-6">
          <dl className="flex flex-col gap-3">
            <SummaryRow label="Date" value={formatDay(playStart, booking.venueTimezone)} />
            <SummaryRow
              label="Time"
              value={`${formatTime(playStart, booking.venueTimezone)}–${formatTime(playEnd, booking.venueTimezone)}`}
            />
            <div className="border-ink mt-2 flex items-baseline justify-between border-t-2 pt-4">
              <dt className="text-[13px] font-bold">Total</dt>
              <dd className="text-2xl font-extrabold tracking-tight">{formatPesos(booking.totalCents)}</dd>
            </div>
          </dl>

          <div className="mt-7">
            <ConfirmPanel bookingId={booking.id} expiresAtIso={booking.holdExpiresAtIso} action={confirmBooking} />
          </div>
        </div>
      </div>
    </main>
  );
};

export default CheckoutPage;
