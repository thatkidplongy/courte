import { notFound, redirect } from 'next/navigation';

import { auth } from '@/auth';
import { fetchVenueMemberships } from '@/lib/api/resources';

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ venueId: string }>;
};

/**
 * Gate two of three (docs: role gating): every page under /manage/[venueId] renders only for
 * a member of THAT venue. Non-members get the same 404 a fabricated id would — whether the
 * venue exists is not their business. Gate one (signed in at all) is proxy.ts; gate three is
 * the API re-checking membership inside every venue-scoped operation.
 *
 * This gate is a convenience for rendering, not the security boundary. A caller who skipped
 * the UI entirely still hits gate three, which is the one that actually protects the data.
 */
const ManageLayout = async ({ children, params }: LayoutProps) => {
  const session = await auth();
  if (!session?.user) redirect('/');

  const { venueId } = await params;
  const memberships = await fetchVenueMemberships(session.user.id);

  if (!memberships.some(membership => membership.venueId === venueId)) notFound();

  return <>{children}</>;
};

export default ManageLayout;
