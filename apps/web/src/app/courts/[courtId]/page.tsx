import { DateTime } from 'luxon';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { isNotFound } from '@/lib/api/client';
import { fetchCourtAvailability } from '@/lib/api/resources';
import { formatDay } from '@/lib/format';
import { createSeries } from '@/server-actions/createSeries';
import { joinWaitlist } from '@/server-actions/joinWaitlist';
import { placeHold } from '@/server-actions/placeHold';

import { BookingForm, type DurationOption, type SlotOption } from './components/BookingForm';
import { WaitlistForm, type WindowOption } from './components/WaitlistForm';

type PageProps = {
  params: Promise<{ courtId: string }>;
  searchParams: Promise<{ date?: string; start?: string }>;
};

const CourtPage = async ({ params, searchParams }: PageProps) => {
  const { courtId } = await params;
  const { date, start } = await searchParams;

  const court = await fetchCourtAvailability(courtId, date).catch(error => {
    if (isNotFound(error)) notFound();
    throw error;
  });

  const timezone = court.venueTimezone;
  const day = DateTime.fromISO(court.dayStartIso, { zone: timezone });

  const slots: SlotOption[] = court.slotStartIsos.map(startIso => ({
    startIso,
    label: DateTime.fromISO(startIso).setZone(timezone).toFormat('h:mm a'),
  }));

  const durations: DurationOption[] = [];
  for (let minutes = court.minDurationMinutes; minutes <= court.maxDurationMinutes; minutes += court.incrementMinutes) {
    durations.push({ minutes, label: minutes % 60 === 0 ? `${minutes / 60} h` : `${minutes} min` });
  }

  // A start that is no longer offerable is dropped rather than preselected, so the form never
  // opens pointing at a slot the next submit would reject.
  const preselectedStartIso = start && slots.some(slot => slot.startIso === start) ? start : null;

  // Hour boundaries for the waitlist window pickers, spanning the day in venue-local time.
  const dayEnd = DateTime.fromISO(court.dayEndIso, { zone: timezone });
  const hourOptions: WindowOption[] = [];
  for (let hour = day; hour < dayEnd; hour = hour.plus({ hours: 1 })) {
    hourOptions.push({ iso: hour.toUTC().toISO() ?? '', label: hour.toFormat('h a') });
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/" className="text-sm font-medium text-neutral-500 transition hover:text-neutral-800">
        ← Back to search
      </Link>

      <div className="mt-5 flex items-end justify-between">
        <div>
          <p className="text-court-700 text-sm font-medium">{formatDay(day.toJSDate(), timezone)}</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-neutral-900">{court.name}</h1>
          <p className="mt-1 capitalize text-neutral-500">
            {court.sport} · {court.isIndoor ? 'indoor' : 'outdoor'}
          </p>
        </div>
      </div>

      <div className="card mt-8 p-7">
        <BookingForm
          courtId={court.id}
          slots={slots}
          durations={durations}
          preselectedStartIso={preselectedStartIso}
          action={placeHold}
          seriesAction={createSeries}
        />
      </div>

      <div className="card mt-6 p-7">
        <h2 className="text-lg font-semibold text-neutral-900">Can&apos;t find a time?</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Join the waitlist and we&apos;ll offer you the first slot that opens in your window.
        </p>
        <div className="mt-5">
          <WaitlistForm courtId={court.id} hourOptions={hourOptions} action={joinWaitlist} />
        </div>
      </div>
    </main>
  );
};

export default CourtPage;
