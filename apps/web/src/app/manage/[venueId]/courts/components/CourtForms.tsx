'use client';

import { useActionState } from 'react';

import { COURT_SURFACES, SPORTS, type OwnedCourt } from '@courte/contract';

import { Notice } from '@/components/atoms/Notice';
import { ControlGroup } from '@/components/molecules/ControlGroup';
import { FormField } from '@/components/molecules/FormField';
import { SelectField, type SelectOption } from '@/components/molecules/SelectField';
import { Button } from '@/components/shadcn/ui/button';
import { Input } from '@/components/shadcn/ui/input';
import { COURT_SURFACE_LABELS, SPORT_LABELS } from '@/consts';
import type { ManageFormState } from '@/server-actions/manageVenue';

type InventoryAction = (state: ManageFormState, formData: FormData) => Promise<ManageFormState>;

const SPORT_OPTIONS: SelectOption[] = SPORTS.map(sport => ({ value: sport, label: SPORT_LABELS[sport] }));
const SURFACE_OPTIONS: SelectOption[] = COURT_SURFACES.map(surface => ({
  value: surface,
  label: COURT_SURFACE_LABELS[surface],
}));

const FormStatus = ({ state }: { state: ManageFormState }) => {
  if (state.error) return <Notice tone="error">{state.error}</Notice>;
  if (state.ok) return <Notice tone="success">Saved.</Notice>;
  return null;
};

export const CourtForm = ({ venueId, action }: { venueId: number; action: InventoryAction }) => {
  const [state, formAction, isPending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="venueId" value={venueId} />

      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label="Name">
          <Input name="name" required maxLength={80} placeholder="Court 4" />
        </FormField>
        <ControlGroup label="Sport">
          <SelectField name="sport" defaultValue="badminton" options={SPORT_OPTIONS} />
        </ControlGroup>
        <ControlGroup label="Surface">
          <SelectField name="surface" defaultValue="indoor" options={SURFACE_OPTIONS} />
        </ControlGroup>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <FormField label="Shortest booking (min)">
          <Input name="minDurationMinutes" type="number" min={15} max={480} defaultValue={60} required />
        </FormField>
        <FormField label="Longest booking (min)">
          <Input name="maxDurationMinutes" type="number" min={15} max={480} defaultValue={180} required />
        </FormField>
        <FormField label="Start times every (min)">
          <Input name="incrementMinutes" type="number" min={5} max={240} defaultValue={30} required />
        </FormField>
        <FormField label="Changeover (min)">
          <Input name="bufferMinutes" type="number" min={0} max={120} defaultValue={0} required />
        </FormField>
      </div>

      <FormStatus state={state} />

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? 'Adding…' : 'Add court'}
      </Button>
    </form>
  );
};

/**
 * One button whose label flips, because archiving and restoring are the same decision read in
 * two directions. Nothing here can delete a court: reservations cascade from it, so a real
 * delete would take paid bookings' slots with it.
 */
export const ArchiveToggle = ({
  venueId,
  court,
  action,
}: {
  venueId: number;
  court: OwnedCourt;
  action: InventoryAction;
}) => {
  const [state, formAction, isPending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="venueId" value={venueId} />
      <input type="hidden" name="courtId" value={court.id} />
      <input type="hidden" name="isArchived" value={String(court.isArchived)} />

      {state.error ? <span className="text-destructive text-[12px] font-semibold">{state.error}</span> : null}

      <Button type="submit" variant="outline" size="sm" disabled={isPending}>
        {court.isArchived ? 'Restore' : 'Archive'}
      </Button>
    </form>
  );
};
