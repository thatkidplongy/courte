import { DateTime } from 'luxon';
import Link from 'next/link';

import { CITY_SEARCH_RADIUS_METRES, SEARCH_DEFAULTS, SPORTS, type CourtSearchItem, type Sport } from '@courte/contract';

import { auth } from '@/auth';
import { HeroBackdrop } from '@/components/atoms/HeroBackdrop';
import { ArrowRightIcon, BoltIcon, CheckIcon, ClockIcon, ShieldIcon } from '@/components/atoms/Icon';
import { SportGlyph } from '@/components/atoms/SportGlyph';
import { EmptyState } from '@/components/molecules/EmptyState';
import { StatTile } from '@/components/molecules/StatTile';
import { CourtCard } from '@/components/organisms/CourtCard';
import { HeroSearchBar } from '@/components/organisms/HeroSearchBar';
import { UpNextCard } from '@/components/organisms/UpNextCard';
import { HOME_TEASER_SIZE, SPORT_LABELS } from '@/consts';
import { fetchBookings, searchCourts } from '@/lib/api/resources';
import { findNextBooking } from '@/lib/bookings';
import { isSport } from '@/lib/courtFilters';
import { formatWholePesos } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * The mockup's fourth badge is "Secure payments". We do not take payment online — a booking is
 * settled at the desk — so the slot carries the strongest claim that is actually true instead.
 */
const TRUST_BADGES = [
  { icon: ClockIcon, label: 'Real-time availability' },
  { icon: BoltIcon, label: 'Instant confirmation' },
  { icon: CheckIcon, label: 'Free cancellation' },
  { icon: ShieldIcon, label: 'Trusted venues' },
] as const;

const TrustBadges = () => (
  <ul className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-3 border-t border-white/15 pt-6">
    {TRUST_BADGES.map(badge => (
      <li
        key={badge.label}
        className="flex items-center gap-2 whitespace-nowrap text-[12.5px] font-medium text-white/80"
      >
        <badge.icon className="text-primary h-4 w-4 shrink-0" />
        {badge.label}
      </li>
    ))}
  </ul>
);

type HeroProps = {
  kicker: string;
  sport: Sport;
  dateIso: string;
};

/**
 * One column of copy with the search bar inside it, and the artwork holding the other column —
 * the mockup's composition. The bar belongs in the hero rather than straddling the seam below
 * it: it is the hero's call to action, and the badges are what close the block underneath.
 *
 * The right column is where the mockup places a photograph. There is no media pipeline and no
 * licensed image, so the panel carries the vector artwork instead — see `HeroBackdrop` for why
 * it is drawn rather than shot.
 */
const Hero = ({ kicker, sport, dateIso }: HeroProps) => (
  <section className="bg-night text-white">
    <div className="mx-auto grid max-w-6xl gap-8 px-5 pb-14 pt-14 sm:px-6 md:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] md:items-center md:gap-10 md:pb-16">
      <div className="min-w-0">
        <p className="text-primary text-[10.5px] font-semibold uppercase tracking-[0.18em]">{kicker}</p>
        <h1 className="mt-5 text-5xl font-extrabold leading-[1.02] tracking-[-0.03em] sm:text-6xl">
          Book your court.
          <br />
          <span className="text-primary">Play your game.</span>
        </h1>
        <p className="mt-5 max-w-md text-[16.5px] leading-relaxed text-white/70">
          Fast, easy and reliable court booking for the sports you love — every venue in {SEARCH_DEFAULTS.label}.
        </p>

        <div className="mt-9">
          <HeroSearchBar sport={sport} dateIso={dateIso} />
        </div>

        <TrustBadges />
      </div>

      <div className="relative hidden min-h-[420px] self-stretch md:block">
        <HeroBackdrop />
      </div>
    </div>
  </section>
);

type SectionHeadingProps = {
  title: string;
  meta?: string;
  action?: { href: string; label: string };
};

const SectionHeading = ({ title, meta, action }: SectionHeadingProps) => (
  <div className="flex flex-wrap items-baseline justify-between gap-3">
    <h2 className="text-3xl font-extrabold tracking-tight">{title}</h2>
    {meta ? <span className="text-muted-foreground text-[12.5px] font-medium">{meta}</span> : null}
    {action ? (
      <Link
        href={action.href}
        className="text-brand-700 hover:text-ink flex items-center gap-1.5 text-[13px] font-bold transition"
      >
        {action.label}
        <ArrowRightIcon className="h-3.5 w-3.5" />
      </Link>
    ) : null}
  </div>
);

/**
 * A scrolling row on a phone and a six-across grid on a desktop. The phone screens in the
 * design put sports in a swipeable strip rather than a grid, and a 2×3 grid of tiles is a lot
 * of vertical space to spend before the reader has seen a single court.
 */
const SportTiles = ({ dateIso }: { dateIso: string }) => (
  <ul className="-mx-5 mt-7 flex snap-x gap-3.5 overflow-x-auto px-5 pb-1 lg:mx-0 lg:grid lg:grid-cols-6 lg:px-0">
    {SPORTS.map(sport => (
      <li key={sport} className="shrink-0 snap-start lg:shrink">
        <Link
          href={`/courts?sport=${sport}&date=${dateIso}`}
          className="border-border hover:border-primary hover:bg-accent flex w-[120px] flex-col gap-3.5 rounded-md border px-4 py-5 transition lg:w-auto"
        >
          <SportGlyph sport={sport} className="h-[26px] w-[26px]" />
          <span className="text-[13px] font-semibold">{SPORT_LABELS[sport]}</span>
        </Link>
      </li>
    ))}
  </ul>
);

/**
 * Read off the result set on screen, so the band can never advertise more than the search
 * actually found. `fromRatePerHourCents` is null for a court with no matching price rule.
 */
const buildStats = (courts: CourtSearchItem[]) => {
  const venueCount = new Set(courts.map(court => court.venueId)).size;
  const rates = courts.map(court => court.fromRatePerHourCents).filter((rate): rate is number => rate !== null);

  return [
    { value: String(venueCount), label: venueCount === 1 ? 'Venue nearby' : 'Venues nearby' },
    { value: String(courts.length), label: courts.length === 1 ? 'Court to book' : 'Courts to book' },
    { value: rates.length === 0 ? '—' : formatWholePesos(Math.min(...rates)), label: 'Cheapest, per hour' },
    { value: '10 min', label: 'Slot hold at checkout' },
  ];
};

const StatsBand = ({ courts }: { courts: CourtSearchItem[] }) => (
  <section className="border-ink mt-16 border-y-2">
    <dl className="divide-border grid grid-cols-2 sm:grid-cols-4 sm:divide-x">
      {buildStats(courts).map((stat, index) => (
        <StatTile key={stat.label} value={stat.value} label={stat.label} className={index === 0 ? 'py-7' : 'p-7'} />
      ))}
    </dl>
  </section>
);

const PLAYER_POINTS = [
  'Book a court in seconds',
  'Live availability and instant confirmation',
  'Pay at the desk or online at checkout',
  'Recurring bookings, and a waitlist when a slot frees up',
] as const;

const VENUE_POINTS = [
  'Manage court availability and blackouts',
  'Take walk-ins and desk payments',
  'Accept bookings around the clock',
  'See the whole day at a glance',
] as const;

const PointList = ({ points }: { points: readonly string[] }) => (
  <ul className="mt-5 flex flex-col gap-3 text-[13.5px] font-medium leading-snug">
    {points.map(point => (
      <li key={point} className="flex gap-2.5">
        <CheckIcon className="text-primary mt-0.5 h-4 w-4" />
        {point}
      </li>
    ))}
  </ul>
);

const AudiencePanels = ({ dateIso }: { dateIso: string }) => (
  <section className="mt-14 grid gap-6 lg:grid-cols-2">
    <div className="bg-accent rounded-md p-9">
      <h3 className="text-2xl font-extrabold tracking-tight">For players</h3>
      <PointList points={PLAYER_POINTS} />
      <Link
        href={`/courts?date=${dateIso}`}
        className="bg-primary hover:bg-brand-700 mt-7 inline-flex items-center gap-2 rounded-md px-5 py-3 text-[13.5px] font-bold text-white transition"
      >
        Find a court
        <ArrowRightIcon className="h-3.5 w-3.5" />
      </Link>
    </div>

    <div className="bg-muted rounded-md p-9">
      <h3 className="text-2xl font-extrabold tracking-tight">For venue owners</h3>
      <PointList points={VENUE_POINTS} />
      {/* No call to action: there is no self-serve onboarding yet, and a button that leads
          nowhere would be the most prominent broken promise on the page. */}
      <p className="text-muted-foreground mt-7 text-[12.5px] font-medium">
        Venue accounts are set up by the Courte team. Sign in to reach your dashboard.
      </p>
    </div>
  </section>
);

type PageProps = {
  searchParams: Promise<{ sport?: string; date?: string }>;
};

const LandingPage = async ({ searchParams }: PageProps) => {
  const params = await searchParams;
  const sport: Sport = isSport(params.sport) ? params.sport : 'pickleball';
  const today = DateTime.now().setZone(SEARCH_DEFAULTS.timezone).toFormat('yyyy-MM-dd');
  const dateIso = params.date ?? today;

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
      />

      {/* Straddles the seam between the night hero and the page, which is the one thing on the
          landing that genuinely floats — a returning player's next game outranks the marketing. */}
      {nextBooking ? (
        <div className="relative z-10 mx-auto -mt-9 max-w-6xl px-5 sm:px-6">
          <UpNextCard booking={nextBooking} className="ring-background ring-4" />
        </div>
      ) : null}

      <div className={cn('mx-auto max-w-6xl px-5 sm:px-6', nextBooking && 'mt-4')}>
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
            <ul className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
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
