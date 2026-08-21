import Link from 'next/link';

import { auth, signIn, signOut } from '@/auth';
import { CourtMark } from '@/components/atoms/Icon';
import { Button } from '@/components/shadcn/ui/button';
import { isProduction } from '@/config/env';
import { PAGE_GUTTER } from '@/consts';
import { fetchVenueMemberships } from '@/lib/api/resources';
import { cn } from '@/lib/utils';

const NAV_LINK_CLASSES = 'text-[13.5px] font-medium text-white/80 transition hover:text-white';

/**
 * Google is the only provider in production, so the button skips the chooser and goes straight
 * there. Development runs on placeholder Google credentials, where that same jump is a dead end
 * — Google answers 401 invalid_client — so it goes to the Auth.js page instead, which offers the
 * dev provider next to it. Either way sign-in returns to the page the button was pressed on.
 */
const SignInButton = () => (
  <form
    action={async () => {
      'use server';
      await signIn(isProduction ? 'google' : undefined);
    }}
  >
    <Button type="submit">Sign in</Button>
  </form>
);

const SignOutButton = () => (
  <form
    action={async () => {
      'use server';
      await signOut();
    }}
  >
    <button type="submit" className={NAV_LINK_CLASSES}>
      Sign out
    </button>
  </form>
);

/**
 * The night bar. It is the same chrome the hero and footer sit on, which is what lets the
 * landing read as one dark block from the top of the page down to the first rule.
 */
export const SiteHeader = async () => {
  const session = await auth();
  const memberships = session?.courteUserId ? await fetchVenueMemberships(session.courteUserId) : [];
  const managedVenueId = memberships[0]?.venueId;

  return (
    <header className="bg-night text-white">
      <div className={cn(PAGE_GUTTER, 'flex h-[76px] items-center gap-5 lg:gap-9')}>
        <Link href="/" className="mr-auto flex items-center gap-2.5">
          <CourtMark className="text-primary h-6 w-6" />
          <span className="text-[19px] font-extrabold tracking-[0.14em]">COURTE</span>
        </Link>
        {/* Below `lg` the bottom tab bar is the navigation, so the links that duplicate it are
            hidden and the header keeps only what the tab bar has no room for. */}
        <nav className="flex items-center gap-5 lg:gap-7">
          <Link href="/courts" className={cn(NAV_LINK_CLASSES, 'hidden lg:inline')}>
            Find a court
          </Link>
          {session?.courteUserId ? (
            <>
              <Link href="/bookings" className={cn(NAV_LINK_CLASSES, 'hidden lg:inline')}>
                My bookings
              </Link>
              {managedVenueId ? (
                <Link href={`/manage/${managedVenueId}`} className={NAV_LINK_CLASSES}>
                  Manage venue
                </Link>
              ) : null}
              <SignOutButton />
            </>
          ) : (
            <SignInButton />
          )}
        </nav>
      </div>
    </header>
  );
};
