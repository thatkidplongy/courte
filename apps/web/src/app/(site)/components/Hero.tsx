import { SEARCH_DEFAULTS, type Sport } from '@courte/contract';

import { HeroBackdrop } from '@/components/atoms/HeroBackdrop';
import { BoltIcon, CheckIcon, ClockIcon, ShieldIcon } from '@/components/atoms/Icon';
import { HeroSearchBar } from '@/components/organisms/HeroSearchBar';

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
  time?: string;
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
export const Hero = ({ kicker, sport, dateIso, time }: HeroProps) => (
  <section className="bg-night text-white">
    {/* The split is uneven because the search bar sets it: one row of four fields plus the submit
        needs 720px, and an even 50/50 left the copy column 100px short of that at every width
        below the 1440 canvas. The artwork reads at 460px; the bar does not. */}
    <div className="mx-auto grid w-full max-w-[1440px] md:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)] md:items-center">
      {/* The gutter is applied to this column rather than the grid, so the artwork beside it can
          run to the canvas edge the way the mockup's photograph does. */}
      <div className="min-w-0 px-5 py-14 sm:px-8 lg:py-16 lg:pl-14 lg:pr-10">
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
          <HeroSearchBar sport={sport} dateIso={dateIso} time={time} />
        </div>

        <TrustBadges />
      </div>

      {/* 520px is the mockup's hero height, and the artwork holds it so the night block does not
          collapse around the copy on a short viewport. */}
      <div className="relative hidden min-h-[520px] self-stretch md:block">
        <HeroBackdrop />
      </div>
    </div>
  </section>
);
