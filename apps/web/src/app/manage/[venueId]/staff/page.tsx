import { notFound, redirect } from 'next/navigation';

import type { VenueStaffMember } from '@courte/contract';

import { auth } from '@/auth';
import { StatusBadge } from '@/components/atoms/StatusBadge';
import { PageHeader } from '@/components/molecules/PageHeader';
import { Panel } from '@/components/molecules/Panel';
import { ApiError, isNotFound } from '@/lib/api/client';
import { fetchVenueStaff } from '@/lib/api/resources';
import { parseRouteId } from '@/lib/ids';
import { addStaff, removeStaff } from '@/server-actions/manageStaff';

import { AddStaffForm, RemoveStaffButton } from './components/StaffForms';

type PageProps = {
  params: Promise<{ venueId: string }>;
};

const ROLE_NOTES = {
  owner: 'Courts, pricing, hours, staff and revenue',
  staff: 'The desk: walk-ins, payments, blackouts and no-shows',
} as const;

const StaffRow = ({ member, venueId }: { member: VenueStaffMember; venueId: number }) => (
  <li className="border-border flex flex-wrap items-center gap-4 rounded-md border p-4">
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2.5">
        <p className="font-bold">{member.name}</p>
        <StatusBadge tone={member.role === 'owner' ? 'positive' : 'neutral'}>
          {member.role === 'owner' ? 'Owner' : 'Staff'}
        </StatusBadge>
        {member.isSelf ? <span className="text-muted-foreground text-[11.5px] font-semibold">you</span> : null}
      </div>
      <p className="text-muted-foreground mt-1.5 text-[12.5px] font-medium">{member.email}</p>
      <p className="text-muted-foreground mt-1 text-[11.5px] font-medium">{ROLE_NOTES[member.role]}</p>
    </div>

    {/* The API refuses self-removal anyway; hiding the button means the owner never meets an
        error for something they were offered. */}
    {member.isSelf ? null : <RemoveStaffButton venueId={venueId} memberId={member.userId} action={removeStaff} />}
  </li>
);

/**
 * Owner-only, and gated by the API rather than by this page: `manageStaff` is not a staff
 * action, so a staff member reaching this URL gets a 403 from the fetch. That is rendered as a
 * short explanation instead of an error page, because a staff member following the rail here
 * has done nothing wrong.
 */
const StaffPage = async ({ params }: PageProps) => {
  const session = await auth();
  if (!session?.courteUserId) redirect('/');

  const routeParams = await params;
  const venueId = parseRouteId(routeParams.venueId);
  if (venueId === null) notFound();

  const staff = await fetchVenueStaff(session.courteUserId, venueId).catch(error => {
    if (isNotFound(error)) notFound();
    // 403 is the honest answer for a staff member here, and it is not a failure to report.
    if (error instanceof ApiError && error.status === 403) return null;
    throw error;
  });

  if (staff === null) {
    return (
      <main className="min-w-0 flex-1 px-5 py-6 lg:px-8">
        <PageHeader title="Staff" subtitle="Owners only" />
        <p className="text-muted-foreground mt-6 text-sm">
          Only an owner can see or change who works here. Everything else in the console is still yours.
        </p>
      </main>
    );
  }

  const owners = staff.filter(member => member.role === 'owner').length;

  return (
    <main className="min-w-0 flex-1 px-5 py-6 lg:px-8">
      <PageHeader
        title="Staff"
        subtitle={`${staff.length} ${staff.length === 1 ? 'person' : 'people'} · ${owners} ${owners === 1 ? 'owner' : 'owners'}`}
      />

      <ul className="mt-6 flex flex-col gap-3">
        {staff.map(member => (
          <StaffRow key={member.userId} member={member} venueId={venueId} />
        ))}
      </ul>

      <Panel className="mt-8" title="Add somebody" description="Or change what an existing colleague can do">
        <AddStaffForm venueId={venueId} action={addStaff} />
      </Panel>
    </main>
  );
};

export default StaffPage;
