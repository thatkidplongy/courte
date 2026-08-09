import { notFound, redirect } from 'next/navigation';

import { auth } from '@/auth';
import { membershipReader } from '@/db/repositories/membershipRepository';
import { requireVenueAction } from '@/domain/authz/venueAccess';
import { DomainError } from '@/domain/errors';

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ venueId: string }>;
};

/**
 * Gate two of three (docs: role gating): every page under /manage/[venueId] renders only for
 * a member of THAT venue. Non-members get the same 404 a fabricated id would — whether the
 * venue exists is not their business. Gate one (signed in at all) is proxy.ts; gate three is
 * every server action re-checking for itself.
 */
const ManageLayout = async ({ children, params }: LayoutProps) => {
  const session = await auth();
  if (!session?.user) redirect('/');

  const { venueId } = await params;

  try {
    await requireVenueAction(membershipReader, session.user.id, venueId, 'viewBookings');
  } catch (error) {
    if (error instanceof DomainError) notFound();
    throw error;
  }

  return <>{children}</>;
};

export default ManageLayout;
