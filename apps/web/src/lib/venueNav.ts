import type { NavLink } from '@/components/molecules/NavLinks';

/**
 * The console's sections, in one place so the rail and the routes cannot disagree about what
 * exists. The mockup draws seven; these are the ones with a route behind them. A nav item that
 * navigates nowhere makes the whole rail untrustworthy, so the list grows as the routes do.
 */
const VENUE_SECTIONS = [
  { segment: '', label: 'Overview' },
  { segment: 'courts', label: 'Courts & pricing' },
] as const;

export const buildVenueNav = (venueId: number): NavLink[] =>
  VENUE_SECTIONS.map(section => ({
    href: section.segment === '' ? `/manage/${venueId}` : `/manage/${venueId}/${section.segment}`,
    label: section.label,
  }));
