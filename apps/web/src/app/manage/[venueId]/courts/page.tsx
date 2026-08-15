import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import type { OwnedCourt } from '@courte/contract';

import { auth } from '@/auth';
import { StatusBadge } from '@/components/atoms/StatusBadge';
import { PageHeader } from '@/components/molecules/PageHeader';
import { Panel } from '@/components/molecules/Panel';
import { COURT_SURFACE_LABELS, SPORT_LABELS } from '@/consts';
import { isNotFound } from '@/lib/api/client';
import { fetchOwnedCourts } from '@/lib/api/resources';
import { parseRouteId } from '@/lib/ids';
import { createCourt, setCourtArchived } from '@/server-actions/manageInventory';

import { ArchiveToggle, CourtForm } from './components/CourtForms';

type PageProps = {
  params: Promise<{ venueId: string }>;
};

const CourtRow = ({ court, venueId }: { court: OwnedCourt; venueId: number }) => (
  <li className="border-border flex flex-wrap items-center gap-4 rounded-md border p-4">
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2.5">
        <p className="font-bold">{court.name}</p>
        {court.isArchived ? <StatusBadge tone="neutral">Archived</StatusBadge> : null}
      </div>
      <p className="text-muted-foreground mt-1.5 text-[12.5px] font-medium">
        {SPORT_LABELS[court.sport]} · {COURT_SURFACE_LABELS[court.surface]} · {court.minDurationMinutes}–
        {court.maxDurationMinutes} min in {court.incrementMinutes}-min steps
        {court.bufferMinutes > 0 ? ` · ${court.bufferMinutes} min changeover` : ''}
      </p>
    </div>

    <div className="flex items-center gap-2">
      <Link
        href={`/manage/${venueId}/courts/${court.id}/pricing`}
        className="border-border hover:border-primary rounded-md border px-3.5 py-2 text-[12.5px] font-bold transition"
      >
        Pricing & hours
      </Link>
      <ArchiveToggle venueId={venueId} court={court} action={setCourtArchived} />
    </div>
  </li>
);

/**
 * Archived courts stay on this list, flagged. They are hidden from players, not from the person
 * who retired them — a screen that simply stopped showing a court would leave no way to undo.
 */
const ManageCourtsPage = async ({ params }: PageProps) => {
  const session = await auth();
  if (!session?.courteUserId) redirect('/');

  const routeParams = await params;

  const venueId = parseRouteId(routeParams.venueId);

  if (venueId === null) notFound();

  const courts = await fetchOwnedCourts(session.courteUserId, venueId).catch(error => {
    if (isNotFound(error)) notFound();
    throw error;
  });

  const liveCount = courts.filter(court => !court.isArchived).length;

  return (
    <main className="min-w-0 flex-1 px-5 py-6 lg:px-8">
      <PageHeader title="Courts & pricing" subtitle={`${liveCount} bookable · ${courts.length - liveCount} archived`} />

      <ul className="mt-6 flex flex-col gap-3">
        {courts.map(court => (
          <CourtRow key={court.id} court={court} venueId={venueId} />
        ))}
      </ul>

      <Panel className="mt-8" title="Add a court">
        <CourtForm venueId={venueId} action={createCourt} />
      </Panel>
    </main>
  );
};

export default ManageCourtsPage;
