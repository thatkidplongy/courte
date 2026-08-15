'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

export type NavLink = {
  href: string;
  label: string;
};

type NavLinksProps = {
  links: NavLink[];
  /**
   * A link whose href is a prefix of the current path counts as active. The overview lives at
   * the venue root, so without this every section would light it up as well as itself.
   */
  className?: string;
};

const isActive = (pathname: string, href: string, links: NavLink[]): boolean => {
  if (pathname === href) return true;

  // Longest match wins: /manage/x/courts/y/pricing is the courts section, not the overview.
  const best = links
    .filter(link => pathname.startsWith(`${link.href}/`) || pathname === link.href)
    .sort((a, b) => b.href.length - a.href.length)[0];

  return best?.href === href;
};

/**
 * The one client component in the venue rail, and it exists for one reason: the rail renders in
 * a server layout, which has no pathname. Passing the active section down from each page is not
 * possible when the layout — not the page — owns the rail.
 */
export const NavLinks = ({ links, className }: NavLinksProps) => {
  const pathname = usePathname();

  return (
    <nav className={cn('flex flex-col gap-0.5 text-[13px] font-semibold', className)}>
      {links.map(link => {
        const active = isActive(pathname, link.href, links);

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'rounded-md px-3 py-2.5 transition',
              active ? 'bg-primary text-white' : 'text-white/65 hover:text-white'
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
};
