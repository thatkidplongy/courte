import Link from 'next/link';

import { auth, signIn, signOut } from '@/auth';
import { CourtMark } from '@/components/atoms/Icon';
import { Button } from '@/components/shadcn/ui/button';
import { fetchVenueMemberships } from '@/lib/api/resources';
import { cn } from '@/lib/utils';

const NAV_LINK_CLASSES = 'text-[13.5px] font-medium text-white/80 transition hover:text-white';

const SignInButton = () => (
  <form
    action={async () => {
      'use server';
      await signIn('google');
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
      <div className="mx-auto flex h-[76px] max-w-6xl items-center gap-5 px-5 sm:px-6 lg:gap-9">
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
