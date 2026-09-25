import { DateTime } from 'luxon';

import { CITY_SEARCH_RADIUS_METRES, SEARCH_DEFAULTS, SPORTS, type Sport } from '@courte/contract';

import { auth } from '@/auth';
import { EmptyState } from '@/components/molecules/EmptyState';
import { CourtCard } from '@/components/organisms/CourtCard';
import { UpNextCard } from '@/components/organisms/UpNextCard';
import { HOME_TEASER_SIZE, PAGE_GUTTER, SEARCH_TIME_OPTIONS, SPORT_LABELS } from '@/consts';
import { fetchBookings, searchCourts } from '@/lib/api';
import { findNextBooking } from '@/lib/bookings';
import { isSport } from '@/lib/courtFilters';
import { cn } from '@/lib/utils';

import { AudiencePanels } from './components/AudiencePanels';
import { Hero } from './components/Hero';
import { SectionHeading } from './components/SectionHeading';
import { SportTiles } from './components/SportTiles';
import { StatsBand } from './components/StatsBand';

type PageProps = {
  searchParams: Promise<{ sport?: string; date?: string; time?: string }>;
};

const LandingPage = async ({ searchParams }: PageProps) => {
  const params = await searchParams;
  const sport: Sport = isSport(params.sport) ? params.sport : 'pickleball';
  const today = DateTime.now().setZone(SEARCH_DEFAULTS.timezone).toFormat('yyyy-MM-dd');
  const dateIso = params.date ?? today;
  // The bar remembers a time the reader came back with, but the teaser below stays unfiltered:
  // the landing shows what the city has, and narrowing it is what /courts is for.
  const time = SEARCH_TIME_OPTIONS.includes(params.time ?? '') ? params.time : undefined;

  // A teaser of the nearest few, over the same radius the marketplace uses so the hero's count
  // and the listing's count are the same number. /courts is where the full inventory lives.
  const { data: courts, total } = await searchCourts({
    sport,
    date: dateIso,
    radiusMetres: CITY_SEARCH_RADIUS_METRES,
    limit: HOME_TEASER_SIZE,
  });

  // The phone home screen opens with the reader's next game, so a returning player sees where
  // they are playing before they see anything being sold. Signed-out readers skip the fetch.
  const session = await auth();
  const nextBooking = session?.courteUserId
    ? findNextBooking((await fetchBookings(session.courteUserId)).data, Date.now())
    : null;

  return (
    <main>
      <Hero
        kicker={`${SEARCH_DEFAULTS.label} · ${total} ${SPORT_LABELS[sport].toLowerCase()} ${total === 1 ? 'court' : 'courts'}`}
        sport={sport}
        dateIso={dateIso}
        time={time}
      />

      {/* Straddles the seam between the night hero and the page, which is the one thing on the
          landing that genuinely floats — a returning player's next game outranks the marketing. */}
      {nextBooking ? (
        <div className={cn(PAGE_GUTTER, 'relative z-10 -mt-9')}>
          <UpNextCard booking={nextBooking} className="ring-background ring-4" />
        </div>
      ) : null}

      <div className={cn(PAGE_GUTTER, nextBooking && 'mt-4')}>
        <section className="border-ink mt-16 border-t-2 pt-12">
          <SectionHeading
            title="Play any sport, anywhere"
            meta={`${SPORTS.length} sports · ${SEARCH_DEFAULTS.label}`}
          />
          <SportTiles dateIso={dateIso} />
        </section>

        <section className="pt-16">
          <SectionHeading
            title="Top courts near you"
            action={{ href: `/courts?sport=${sport}&date=${dateIso}`, label: 'View all' }}
          />

          {courts.length === 0 ? (
            <EmptyState
              className="mt-7"
              title={`No ${SPORT_LABELS[sport].toLowerCase()} courts that day`}
              description="Try another sport or date."
              action={{ href: '/courts', label: 'Show every court' }}
            />
          ) : (
            <ul className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {courts.map(court => (
                <CourtCard key={court.id} court={court} dateIso={dateIso} />
              ))}
            </ul>
          )}
        </section>

        <StatsBand courts={courts} />
        <AudiencePanels dateIso={dateIso} />
      </div>
    </main>
  );
};

export default LandingPage;
