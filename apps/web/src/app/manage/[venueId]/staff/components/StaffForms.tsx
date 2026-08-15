'use client';

import { useActionState } from 'react';

import { VENUE_ROLES } from '@courte/contract';

import { Notice } from '@/components/atoms/Notice';
import { ControlGroup } from '@/components/molecules/ControlGroup';
import { FormField } from '@/components/molecules/FormField';
import { SelectField, type SelectOption } from '@/components/molecules/SelectField';
import { Button } from '@/components/shadcn/ui/button';
import { Input } from '@/components/shadcn/ui/input';
import type { ManageFormState } from '@/server-actions/manageVenue';

type StaffAction = (state: ManageFormState, formData: FormData) => Promise<ManageFormState>;

const ROLE_OPTIONS: SelectOption[] = VENUE_ROLES.map(role => ({
  value: role,
  label: role === 'owner' ? 'Owner — can change what the venue sells and who works here' : 'Staff — can run the desk',
}));

const FormStatus = ({ state }: { state: ManageFormState }) => {
  if (state.error) return <Notice tone="error">{state.error}</Notice>;
  if (state.ok) return <Notice tone="success">Done.</Notice>;
  return null;
};

/**
 * By email, because that is what an owner knows about the person they are hiring — there is no
 * user directory to search and there should not be one.
 *
 * Posting an existing member's address changes their role rather than erroring, since promoting
 * a colleague and hiring one are the same gesture from the owner's side.
 */
export const AddStaffForm = ({ venueId, action }: { venueId: number; action: StaffAction }) => {
  const [state, formAction, isPending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="venueId" value={venueId} />

      <FormField label="Email">
        <Input name="email" type="email" required placeholder="colleague@venue.test" />
      </FormField>

      <ControlGroup label="Role">
        <SelectField name="role" defaultValue="staff" options={ROLE_OPTIONS} />
      </ControlGroup>

      <p className="text-muted-foreground text-[11.5px] font-medium">
        They must have signed in to Courte at least once. Adding somebody who already works here changes their role
        instead.
      </p>

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? 'Saving…' : 'Add or update'}
      </Button>

      <FormStatus state={state} />
    </form>
  );
};

export const RemoveStaffButton = ({
  venueId,
  memberId,
  action,
}: {
  venueId: number;
  memberId: number;
  action: StaffAction;
}) => {
  const [state, formAction, isPending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="venueId" value={venueId} />
      <input type="hidden" name="memberId" value={memberId} />
      <Button type="submit" variant="destructive" size="sm" disabled={isPending}>
        {isPending ? 'Removing…' : 'Remove'}
      </Button>
      {state.error ? (
        <span role="alert" className="text-destructive max-w-64 text-right text-[11px] font-medium">
          {state.error}
        </span>
      ) : null}
    </form>
  );
};
