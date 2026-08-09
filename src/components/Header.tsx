import Link from 'next/link';

import { auth, signIn, signOut } from '@/auth';
import { CourtMark } from '@/components/icons';
import { findMembershipsForUser } from '@/db/repositories/membershipRepository';

const SignInButton = () => (
  <form
    action={async () => {
      'use server';
      await signIn('google');
    }}
  >
    <button
      type="submit"
      className="rounded-full bg-court-500 px-5 py-2 text-sm font-semibold text-ink-950 transition hover:bg-court-400"
    >
      Sign in
    </button>
  </form>
);

const SignOutButton = () => (
  <form
    action={async () => {
      'use server';
      await signOut();
    }}
  >
    <button type="submit" className="text-sm text-neutral-500 transition hover:text-white">
      Sign out
    </button>
  </form>
);

export const Header = async () => {
  const session = await auth();
  const memberships = session?.user ? await findMembershipsForUser(session.user.id) : [];
  const managedVenueId = memberships[0]?.venueId;

  return (
    <header className="border-b border-white/5 bg-ink-950 text-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <CourtMark className="h-6 w-6 text-court-400" />
          COURTE
        </Link>
        <nav className="flex items-center gap-7">
          <Link href="/" className="text-sm font-medium text-neutral-300 transition hover:text-white">
            Find a court
          </Link>
          {session?.user ? (
            <>
              <Link href="/bookings" className="text-sm font-medium text-neutral-300 transition hover:text-white">
                My bookings
              </Link>
              {managedVenueId ? (
                <Link
                  href={`/manage/${managedVenueId}`}
                  className="text-sm font-medium text-neutral-300 transition hover:text-white"
                >
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
