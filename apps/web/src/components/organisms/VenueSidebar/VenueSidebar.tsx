import Link from 'next/link';

import { CourtMark } from '@/components/atoms/Icon';
import { cn } from '@/lib/utils';

export type VenueNavItem = {
  href: string;
  label: string;
  isActive: boolean;
};

type VenueSidebarProps = {
  venueName: string;
  /** "4 courts · Cebu City" — the line under the venue name in the switcher card. */
  venueMeta: string;
  items: VenueNavItem[];
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

      <nav className="flex flex-col gap-0.5 text-[13px] font-semibold">
        {items.map(item => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={item.isActive ? 'page' : undefined}
            className={cn(
              'rounded-md px-3 py-2.5 transition',
              item.isActive ? 'bg-primary text-white' : 'text-white/65 hover:text-white'
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  </aside>
);
