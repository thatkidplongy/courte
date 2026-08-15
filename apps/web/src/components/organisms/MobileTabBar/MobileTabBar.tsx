'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { CalendarIcon, HomeIcon, SearchIcon } from '@/components/atoms/Icon';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/', label: 'Home', icon: HomeIcon },
  { href: '/courts', label: 'Explore', icon: SearchIcon },
  { href: '/bookings', label: 'Bookings', icon: CalendarIcon },
] as const;

/**
 * The phone screens in the design navigate from a bottom bar rather than the site header, so
 * below `lg` this is the navigation and the header is just identity.
 *
 * Three tabs, not the mockup's four: there is no profile screen, and a tab that leads nowhere
 * is more annoying on a phone than anywhere else — it is a thumb's first target.
 */
export const MobileTabBar = () => {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="border-border bg-background fixed inset-x-0 bottom-0 z-40 flex border-t lg:hidden"
    >
      {TABS.map(tab => {
        // `/` would otherwise light up on every route, since every path starts with it.
        const isActive = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex flex-1 flex-col items-center gap-1.5 py-2.5 text-[9.5px] font-semibold transition',
              isActive ? 'text-brand-700' : 'text-muted-foreground'
            )}
          >
            <tab.icon className="h-5 w-5" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
};
