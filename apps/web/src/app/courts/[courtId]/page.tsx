import { DateTime } from 'luxon';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import type { Amenity } from '@courte/contract';

import { BackLink } from '@/components/atoms/BackLink';
import { FieldLabel } from '@/components/atoms/FieldLabel';
import { CalendarIcon, CourtMark, GlobeIcon, PhoneIcon, PinIcon, UsersIcon } from '@/components/atoms/Icon';
import { VenueGallery } from '@/components/molecules/VenueGallery';
import { DAY_STRIP_LENGTH, SPORT_LABELS } from '@/consts';
import { isNotFound } from '@/lib/api/client';
import { fetchVenueSchedule } from '@/lib/api/resources';
import { cn } from '@/lib/utils';
import { createSeries } from '@/server-actions/createSeries';
import { placeHold } from '@/server-actions/placeHold';

import { VenueSchedule } from './components/VenueSchedule';

type PageProps = {
  params: Promise<{ courtId: string }>;
  searchParams: Promise<{ date?: string; start?: string }>;
};

/** The chrome for a booking screen: one way back, and the mark. No marketing nav. */
const CourtHeader = () => (
  <header className="border-ink flex h-[62px] items-center gap-5 border-b-2 px-5 lg:px-8">
    <BackLink href="/courts">Back to results</BackLink>
    <span className="ml-auto flex items-center gap-2.5">
      <CourtMark className="text-primary h-[19px] w-[19px]" />
      <span className="text-[15px] font-extrabold tracking-[0.14em]">COURTE</span>
    </span>
  </header>
);

type FactProps = {
  icon: typeof CalendarIcon;
  children: React.ReactNode;
};

const Fact = ({ icon: Icon, children }: FactProps) => (
  <li className="flex items-center gap-2.5 text-[13px] font-medium">
    <Icon className="text-primary h-4 w-4" />
    {children}
  </li>
);

/**
 * Rendered only when the venue has claimed something. An empty "Amenities" heading reads as
 * "this venue has none", which is a different and unearned claim from "we were not told".
 */
const VenueAmenities = ({ amenities }: { amenities: Amenity[] }) => {
  if (amenities.length === 0) return null;

  return (
    <section className="mt-6">
      <FieldLabel>Amenities</FieldLabel>
      <ul className="mt-3 flex flex-wrap gap-2">
        {amenities.map(amenity => (
          <li key={amenity.slug} className="border-border rounded-md border px-3 py-1.5 text-[12.5px] font-semibold">
            {amenity.label}
          </li>
        ))}
      </ul>
    </section>
  );
};

const DayStrip = ({ courtId, dateIso, timezone }: { courtId: string; dateIso: string; timezone: string }) => {
  const today = DateTime.now().setZone(timezone).startOf('day');
  const days = Array.from({ length: DAY_STRIP_LENGTH }, (_, offset) => today.plus({ days: offset }));

  return (
    <nav aria-label="Choose a day" className="mt-7 flex flex-wrap gap-2">
      {days.map(day => {
        const iso = day.toFormat('yyyy-MM-dd');
        const isActive = iso === dateIso;

        return (
          <Link
            key={iso}
            href={`/courts/${courtId}?date=${iso}`}
            aria-current={isActive ? 'date' : undefined}
            className={cn(
              'rounded-md border px-3.5 py-2.5 text-center text-[12.5px] font-semibold leading-tight transition',
              isActive ? 'border-ink bg-ink text-white' : 'border-border hover:border-primary'
            )}
          >
            {day.toFormat('ccc')}
            <br />
            <span className="text-[15px] font-extrabold">{day.toFormat('dd')}</span>
          </Link>
        );
      })}
    </nav>
  );
};

const CourtPage = async ({ params, searchParams }: PageProps) => {
  const { courtId } = await params;
  const { date, start } = await searchParams;

  const schedule = await fetchVenueSchedule(courtId, date).catch(error => {
    if (isNotFound(error)) notFound();
    throw error;
  });

  const timezone = schedule.venueTimezone;
  const day = DateTime.fromISO(schedule.dayStartIso, { zone: timezone });
  const dateIso = day.toFormat('yyyy-MM-dd');
  const anchorCourt = schedule.courts.find(court => court.id === schedule.courtId);

  // A start carried in from a search chip only survives if it is still open on arrival —
  // otherwise the panel would open pointing at a cell the next submit would reject.
  const preselected =
    start && anchorCourt?.cells.some(cell => cell.startIso === start && cell.state === 'open')
      ? { courtId: schedule.courtId, startIso: start }
      : null;

  return (
    <>
      <CourtHeader />

      {anchorCourt ? <VenueGallery photos={schedule.venuePhotos} sport={anchorCourt.sport} /> : null}

      <main className="mx-auto max-w-6xl px-5 py-8 lg:px-8 lg:py-10">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-[34px]">{schedule.venueName}</h1>
        <p className="text-muted-foreground mt-3 flex items-center gap-1.5 text-[13.5px] font-medium">
          <PinIcon className="h-4 w-4" />
          {schedule.venueAddress}
        </p>

        {schedule.venueDescription ? (
          <p className="mt-4 max-w-2xl text-[14.5px] leading-relaxed">{schedule.venueDescription}</p>
        ) : null}

        <ul className="border-ink border-border mt-6 flex flex-wrap gap-x-7 gap-y-3 border-b border-t-2 py-5">
          {schedule.openingLabel ? <Fact icon={CalendarIcon}>Open {schedule.openingLabel}</Fact> : null}
          <Fact icon={UsersIcon}>
            {schedule.courts.length} {schedule.courts.length === 1 ? 'court' : 'courts'}
          </Fact>
          {anchorCourt ? <Fact icon={PinIcon}>{SPORT_LABELS[anchorCourt.sport]}</Fact> : null}
          {schedule.venuePhone ? (
            <Fact icon={PhoneIcon}>
              <a href={`tel:${schedule.venuePhone}`} className="hover:text-primary transition">
                {schedule.venuePhone}
              </a>
            </Fact>
          ) : null}
          {schedule.venueWebsite ? (
            <Fact icon={GlobeIcon}>
              <a
                href={schedule.venueWebsite}
                rel="noopener noreferrer nofollow"
                target="_blank"
                className="hover:text-primary transition"
              >
                Website
              </a>
            </Fact>
          ) : null}
        </ul>

        <VenueAmenities amenities={schedule.venueAmenities} />

        <DayStrip courtId={schedule.courtId} dateIso={dateIso} timezone={timezone} />

        <div className="mt-8">
          <VenueSchedule
            schedule={schedule}
            dayLabel={day.toFormat('cccc, d LLLL')}
            preselected={preselected}
            holdAction={placeHold}
            seriesAction={createSeries}
          />
        </div>
      </main>
    </>
  );
};

export default CourtPage;
