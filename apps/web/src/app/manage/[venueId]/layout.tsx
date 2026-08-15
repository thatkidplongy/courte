import type { ReactNode } from 'react';

import { notFound, redirect } from 'next/navigation';

import { auth } from '@/auth';
import { VenueSidebar } from '@/components/organisms/VenueSidebar';
import { isNotFound } from '@/lib/api/client';
import { fetchVenueDashboard } from '@/lib/api/resources';
import { parseRouteId } from '@/lib/ids';
import { buildVenueNav } from '@/lib/venueNav';

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ venueId: string }>;
};

/**
 * The console's chrome, hoisted out of the overview page now that there is more than one screen
 * behind the rail. The dashboard call is what proves membership: a caller with no row at this
 * venue gets a 404 here, before any child page runs, and cannot tell a real venue from a
 * fabricated one.
 */
const ManageLayout = async ({ children, params }: LayoutProps) => {
  const session = await auth();
  if (!session?.courteUserId) redirect('/');

  const routeParams = await params;

  const venueId = parseRouteId(routeParams.venueId);

  if (venueId === null) notFound();

  const dashboard = await fetchVenueDashboard(session.courteUserId, venueId).catch(error => {
    if (isNotFound(error)) notFound();
    throw error;
  });

  const courtCount = dashboard.courts.length;

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <VenueSidebar
        venueName={dashboard.venueName}
        venueMeta={`${courtCount} ${courtCount === 1 ? 'court' : 'courts'}`}
        items={buildVenueNav(venueId)}
      />
      {children}
    </div>
  );
};

export default ManageLayout;
