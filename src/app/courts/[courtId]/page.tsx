import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DateTime } from 'luxon';

import { findCourtById } from '@/db/repositories/courtRepository';
import { findVenueTimezones } from '@/db/repositories/venueRepository';
import { listStartTimes } from '@/domain/availability/listStartTimes';
import { formatDay } from '@/lib/format';
import { createSeries } from '@/server-actions/createSeries';
import { joinWaitlist } from '@/server-actions/joinWaitlist';
import { placeHold } from '@/server-actions/placeHold';
import { getAvailabilityForCourts } from '@/services/availabilityService';

import { BookingForm, type DurationOption, type SlotOption } from './components/BookingForm';
import { WaitlistForm, type WindowOption } from './components/WaitlistForm';

const MAX_SLOTS_SHOWN = 32;

type PageProps = {
  params: Promise<{ courtId: string }>;
  searchParams: Promise<{ date?: string; start?: string }>;
};

const CourtPage = async ({ params, searchParams }: PageProps) => {
  const { courtId } = await params;
  const { date, start } = await searchParams;

  const court = await findCourtById(courtId);
  if (!court) notFound();

  const timezone = (await findVenueTimezones([court.venueId])).get(court.venueId);
  if (!timezone) notFound();

  const day = date
    ? DateTime.fromISO(date, { zone: timezone }).startOf('day')
    : DateTime.now().setZone(timezone).startOf('day');
  if (!day.isValid) notFound();

  const range = { start: day.toMillis(), end: day.plus({ days: 1 }).toMillis() };
  const availability = await getAvailabilityForCourts([court], range);

  const slotStarts = listStartTimes({
    free: availability.get(court.id)?.free ?? [],
    durationMinutes: court.minDurationMinutes,
    incrementMinutes: court.incrementMinutes,
    notBefore: Date.now(),
    limit: MAX_SLOTS_SHOWN,
  });

  const slots: SlotOption[] = slotStarts.map(startMs => ({
    startIso: new Date(startMs).toISOString(),
    label: DateTime.fromMillis(startMs).setZone(timezone).toFormat('h:mm a'),
  }));

  const durations: DurationOption[] = [];
  for (let minutes = court.minDurationMinutes; minutes <= court.maxDurationMinutes; minutes += court.incrementMinutes) {
    durations.push({ minutes, label: minutes % 60 === 0 ? `${minutes / 60} h` : `${minutes} min` });
  }

  const preselected = start ? new Date(Number(start)).toISOString() : null;
  const preselectedStartIso = preselected && slots.some(slot => slot.startIso === preselected) ? preselected : null;

  // Hour boundaries for the waitlist window pickers, spanning the day in venue-local time.
  const hourOptions: WindowOption[] = [];
  for (let hour = day; hour < day.plus({ days: 1 }); hour = hour.plus({ hours: 1 })) {
    hourOptions.push({ iso: hour.toUTC().toISO() ?? '', label: hour.toFormat('h a') });
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/" className="text-sm font-medium text-neutral-500 transition hover:text-neutral-800">
        ← Back to search
      </Link>

      <div className="mt-5 flex items-end justify-between">
        <div>
          <p className="text-sm font-medium text-court-700">{formatDay(day.toJSDate(), timezone)}</p>
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
