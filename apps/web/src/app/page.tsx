import { DateTime } from 'luxon';
import Link from 'next/link';

import { SEARCH_DEFAULTS, SPORTS, type CourtSearchItem, type Sport } from '@courte/contract';

import { BoltIcon, CheckIcon, ClockIcon, PinIcon, ShieldIcon } from '@/components/icons';
import { SPORT_BANNERS, SPORT_LABELS } from '@/consts';
import { searchCourts } from '@/lib/api/resources';
import { formatDistance, formatTime } from '@/lib/format';

const isSport = (value: string | undefined): value is Sport => SPORTS.includes(value as Sport);

type SearchInput = {
  sport: Sport;
  dateIso: string;
};

const SearchBar = ({ sport, dateIso }: SearchInput) => (
  <form
    method="GET"
    className="flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-[0_20px_50px_-20px_rgb(0_0_0/0.45)] sm:flex-row sm:items-end sm:gap-0 sm:divide-x sm:divide-neutral-200 sm:p-2.5"
  >
    <label className="flex flex-1 flex-col gap-1 sm:px-4 sm:py-1.5">
      <span className="field-label">Sport</span>
      <select
        name="sport"
        defaultValue={sport}
        className="bg-transparent text-sm font-semibold text-neutral-900 focus:outline-none"
      >
        {SPORTS.map(option => (
          <option key={option} value={option}>
            {SPORT_LABELS[option]}
          </option>
        ))}
      </select>
    </label>
    <label className="flex flex-1 flex-col gap-1 sm:px-4 sm:py-1.5">
      <span className="field-label">Location</span>
      <span className="flex items-center gap-1.5 text-sm font-semibold text-neutral-900">
        <PinIcon className="text-court-600 h-3.5 w-3.5" />
        Quezon City
      </span>
    </label>
    <label className="flex flex-1 flex-col gap-1 sm:px-4 sm:py-1.5">
      <span className="field-label">Date</span>
      <input
        type="date"
        name="date"
        defaultValue={dateIso}
        className="bg-transparent text-sm font-semibold text-neutral-900 focus:outline-none"
      />
    </label>
    <div className="sm:pl-3">
      <button type="submit" className="btn-primary w-full sm:w-auto">
        Search courts
      </button>
    </div>
  </form>
);

const TRUST_BADGES = [
  { icon: ClockIcon, label: 'Real-time availability' },
  { icon: BoltIcon, label: 'Instant confirmation' },
  { icon: ShieldIcon, label: 'Trusted venues' },
  { icon: CheckIcon, label: 'Free cancellation window' },
] as const;

const TrustBadges = () => (
  <ul className="flex flex-wrap items-center gap-x-7 gap-y-2">
    {TRUST_BADGES.map(badge => (
      <li key={badge.label} className="flex items-center gap-2 text-sm text-neutral-400">
        <badge.icon className="text-court-400 h-4 w-4" />
        {badge.label}
      </li>
    ))}
  </ul>
);

type CourtCardProps = {
  court: CourtSearchItem;
  dateIso: string;
};

const CourtCard = ({ court, dateIso }: CourtCardProps) => (
  <li className="card group overflow-hidden transition hover:-translate-y-0.5 hover:shadow-[0_1px_3px_rgb(0_0_0/0.06),0_20px_40px_-16px_rgb(0_0_0/0.18)]">
    <Link href={`/courts/${court.id}?date=${dateIso}`} className="block">
      <div className={`relative h-32 bg-gradient-to-br ${SPORT_BANNERS[court.sport]}`}>
        <span className="absolute left-4 top-4 rounded-full bg-black/25 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
          {SPORT_LABELS[court.sport]}
        </span>
        <span className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-neutral-800">
          {court.isIndoor ? 'Indoor' : 'Outdoor'}
        </span>
      </div>
    </Link>
    <div className="p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="truncate text-lg font-semibold text-neutral-900">{court.venueName}</h2>
        <span className="flex shrink-0 items-center gap-1 text-sm text-neutral-500">
          <PinIcon className="h-3.5 w-3.5" />
          {formatDistance(court.distanceMetres)}
        </span>
      </div>
      <p className="mt-0.5 text-sm text-neutral-500">{court.name}</p>
      {court.fromRatePerHourCents !== null ? (
        <p className="mt-2 text-sm text-neutral-500">
          from{' '}
          <span className="text-court-700 text-base font-bold">₱{Math.round(court.fromRatePerHourCents / 100)}</span>
          /hr
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {court.slotStartIsos.length === 0 ? (
          <span className="text-sm text-neutral-400">Fully booked this day</span>
        ) : (
          court.slotStartIsos.map(startIso => (
            <Link
              key={startIso}
              href={`/courts/${court.id}?date=${dateIso}&start=${encodeURIComponent(startIso)}`}
              className="chip"
            >
              {formatTime(new Date(startIso), court.venueTimezone)}
            </Link>
          ))
        )}
        <Link
          href={`/courts/${court.id}?date=${dateIso}`}
          className="text-court-700 hover:text-court-800 ml-auto text-sm font-medium transition group-hover:translate-x-0.5"
        >
          all times →
        </Link>
      </div>
    </div>
  </li>
);

const EmptyState = ({ sport }: { sport: Sport }) => (
  <div className="card p-12 text-center">
    <p className="text-lg font-medium text-neutral-700">
      No {SPORT_LABELS[sport].toLowerCase()} courts nearby that day
    </p>
    <p className="mt-1 text-sm text-neutral-500">Try another sport or date.</p>
  </div>
);

const STATS = [
  { value: '2', label: 'Venues onboard' },
  { value: '24/7', label: 'Courts that never close' },
  { value: '₱450+', label: 'Courts from, per hour' },
  { value: '10 min', label: 'Slot hold at checkout' },
] as const;

const StatsBand = () => (
  <section className="bg-court-50 mt-16 rounded-3xl px-8 py-10">
    <dl className="grid grid-cols-2 gap-8 sm:grid-cols-4">
      {STATS.map(stat => (
        <div key={stat.label} className="text-center">
          <dd className="text-court-800 text-3xl font-extrabold tracking-tight">{stat.value}</dd>
          <dt className="mt-1 text-sm text-neutral-600">{stat.label}</dt>
        </div>
      ))}
    </dl>
  </section>
);

type PageProps = {
  searchParams: Promise<{ sport?: string; date?: string }>;
};

const SearchPage = async ({ searchParams }: PageProps) => {
  const params = await searchParams;
  const sport: Sport = isSport(params.sport) ? params.sport : 'pickleball';
  const today = DateTime.now().setZone(SEARCH_DEFAULTS.timezone).toFormat('yyyy-MM-dd');
  const dateIso = params.date ?? today;

  // One call. Availability, the cheapest public rate and the bookable chips are all decided
  // by the API — a second client asking the same question gets the same answer.
  const { data: courts } = await searchCourts({ sport, date: dateIso });

  return (
    <main>
      <section className="bg-ink-950 bg-[radial-gradient(80rem_40rem_at_70%_-10%,rgb(16_185_104/0.18),transparent)] text-white">
        <div className="mx-auto max-w-6xl px-6 pb-28 pt-16 sm:pt-24">
          <h1 className="max-w-2xl text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
            Book your court.
            <br />
            <span className="text-court-400">Play your game.</span>
          </h1>
          <p className="mt-4 max-w-md text-lg text-neutral-400">
            Fast, easy and reliable court booking for the sports you love.
          </p>
          <div className="mt-8">
            <TrustBadges />
          </div>
        </div>
      </section>

      <div className="mx-auto -mt-14 max-w-6xl px-6">
        <SearchBar sport={sport} dateIso={dateIso} />
      </div>

      <div className="mx-auto max-w-6xl px-6 pt-14">
        <div className="flex items-baseline justify-between">
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900">Top courts near you</h2>
          <p className="text-sm text-neutral-500">{DateTime.fromISO(dateIso).toFormat('ccc, d LLL')}</p>
        </div>

        {courts.length === 0 ? (
          <div className="mt-6">
            <EmptyState sport={sport} />
          </div>
        ) : (
          <ul className="mt-6 grid gap-6 sm:grid-cols-2">
            {courts.map(court => (
              <CourtCard key={court.id} court={court} dateIso={dateIso} />
            ))}
          </ul>
        )}

        <StatsBand />
      </div>
    </main>
  );
};

export default SearchPage;
