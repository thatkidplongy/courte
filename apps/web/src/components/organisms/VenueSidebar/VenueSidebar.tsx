import Link from 'next/link';

import { CourtMark } from '@/components/atoms/Icon';
import { NavLinks, type NavLink } from '@/components/molecules/NavLinks';

type VenueSidebarProps = {
  venueName: string;
  /** "4 courts · Cebu City" — the line under the venue name in the switcher card. */
  venueMeta: string;
  items: NavLink[];
};

/**
 * The venue console's night rail. It carries only sections that exist — the mockup shows seven,
 * and six of them (Calendar, Payouts, Reviews…) have no route behind them. A nav item that
 * navigates nowhere is worse than a short nav: it makes the whole rail untrustworthy.
 */
export const VenueSidebar = ({ venueName, venueMeta, items }: VenueSidebarProps) => (
  <aside className="bg-night text-white lg:w-[216px] lg:shrink-0">
    <div className="px-4 py-6">
      <Link href="/" className="mb-7 flex items-center gap-2.5">
        <CourtMark className="text-primary h-5 w-5" />
        <span className="text-[15px] font-extrabold tracking-[0.14em]">COURTE</span>
      </Link>

      <p className="mb-3.5 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-white/40">Venue</p>
      <div className="mb-6 rounded-md bg-white/[0.07] p-3">
        <p className="text-[13px] font-bold leading-tight">{venueName}</p>
        <p className="mt-1.5 text-[10.5px] font-medium text-white/50">{venueMeta}</p>
      </div>

      <NavLinks links={items} />
    </div>
  </aside>
);
