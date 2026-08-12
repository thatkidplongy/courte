import { notFound, redirect } from 'next/navigation';

import { auth } from '@/auth';
import { isNotFound } from '@/lib/api/client';
import { fetchBooking } from '@/lib/api/resources';
import { formatDay, formatPesos, formatTime } from '@/lib/format';
import { confirmBooking } from '@/server-actions/confirmBooking';

import { ConfirmPanel } from './components/ConfirmPanel';

type PageProps = {
  params: Promise<{ bookingId: string }>;
};

const CheckoutPage = async ({ params }: PageProps) => {
  const session = await auth();
  if (!session?.user) redirect('/');

  const { bookingId } = await params;

  const booking = await fetchBooking(session.user.id, bookingId).catch(error => {
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
      <h1 className="text-center text-3xl font-extrabold tracking-tight text-neutral-900">Almost there</h1>
      <p className="mt-1 text-center text-neutral-500">Confirm within the hold window and it&apos;s yours.</p>

      <div className="card mt-8 overflow-hidden">
        <div className="border-b border-neutral-100 bg-neutral-50/60 px-7 py-5">
          <p className="text-lg font-semibold text-neutral-900">{booking.venueName}</p>
          <p className="mt-0.5 text-sm text-neutral-500">{booking.courtNames.join(', ')}</p>
        </div>
        <div className="px-7 py-6">
          <dl className="flex flex-col gap-2.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-neutral-500">Date</dt>
              <dd className="font-medium text-neutral-900">{formatDay(playStart, booking.venueTimezone)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-500">Time</dt>
              <dd className="font-medium text-neutral-900">
                {formatTime(playStart, booking.venueTimezone)}–{formatTime(playEnd, booking.venueTimezone)}
              </dd>
            </div>
            <div className="mt-2 flex items-baseline justify-between border-t border-neutral-100 pt-4">
              <dt className="text-neutral-500">Total</dt>
              <dd className="text-2xl font-extrabold tracking-tight text-neutral-900">
                {formatPesos(booking.totalCents)}
              </dd>
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
