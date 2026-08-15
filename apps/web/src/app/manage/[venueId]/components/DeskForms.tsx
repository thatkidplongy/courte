'use client';

import { useActionState } from 'react';

import { DateTime } from 'luxon';

import { Notice } from '@/components/atoms/Notice';
import { ControlGroup } from '@/components/molecules/ControlGroup';
import { FormField } from '@/components/molecules/FormField';
import { SelectField, type SelectOption } from '@/components/molecules/SelectField';
import { Button } from '@/components/shadcn/ui/button';
import { Input } from '@/components/shadcn/ui/input';
import type { ManageFormState } from '@/server-actions/manageVenue';

type CourtOption = {
  id: number;
  name: string;
};

type DeskAction = (state: ManageFormState, formData: FormData) => Promise<ManageFormState>;

const DURATION_OPTIONS: SelectOption[] = [
  { value: '60', label: '1 h' },
  { value: '90', label: '90 min' },
  { value: '120', label: '2 h' },
  { value: '180', label: '3 h' },
];

const SOURCE_OPTIONS: SelectOption[] = [
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'phone', label: 'Phone' },
];

const PAYMENT_METHOD_OPTIONS: SelectOption[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'gcash', label: 'GCash' },
  { value: 'maya', label: 'Maya' },
  { value: 'card', label: 'Card' },
];

// A DOM select value is a string whatever it identifies, so the id is stringified for the
// control and parsed back out of the FormData on the server.
const toCourtOptions = (courts: CourtOption[]): SelectOption[] =>
  courts.map(court => ({ value: String(court.id), label: court.name }));

const FormStatus = ({ state }: { state: ManageFormState }) => {
  if (state.error) return <Notice tone="error">{state.error}</Notice>;
  if (state.ok) return <Notice tone="success">Done.</Notice>;
  return null;
};

const toUtcIso = (local: string): string => {
  const parsed = DateTime.fromISO(local);
  return parsed.toUTC().toISO() ?? '';
};

/**
 * The one native picker left in the app. `SelectField` and `DateField` exist because the OS
 * draws — and refuses to style — a native popup, but neither covers a date *and* a time in one
 * field, and the desk forms need both. Rather than fake it with two controls that can disagree,
 * this stays native until there is a styled datetime primitive. Tracked in CONVENTIONS.md.
 */
const DateTimeInput = ({ name }: { name: string }) => <Input type="datetime-local" name={name} required />;

type WalkInFormProps = {
  venueId: number;
  courts: CourtOption[];
  action: DeskAction;
};

/**
 * datetime-local inputs carry no zone; staff type the venue's wall clock on a machine
 * assumed to be at the venue, so the browser zone is the venue zone. Converted to UTC here
 * before it crosses to the server.
 */
export const WalkInForm = ({ venueId, courts, action }: WalkInFormProps) => {
  const [state, formAction, isPending] = useActionState(action, {});
  const courtOptions = toCourtOptions(courts);

  const handleSubmit = (formData: FormData) => {
    formData.set('startIso', toUtcIso(String(formData.get('startLocal') ?? '')));
    formAction(formData);
  };

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <input type="hidden" name="venueId" value={venueId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Customer">
          <Input name="customerName" required placeholder="Maria Santos" />
        </FormField>
        <ControlGroup label="Court">
          <SelectField name="courtId" defaultValue={courtOptions[0]?.value} options={courtOptions} />
        </ControlGroup>
        <FormField label="Start">
          <DateTimeInput name="startLocal" />
        </FormField>
        <ControlGroup label="Duration">
          <SelectField name="durationMinutes" defaultValue="60" options={DURATION_OPTIONS} />
        </ControlGroup>
        <ControlGroup label="Source">
          <SelectField name="source" defaultValue="walk_in" options={SOURCE_OPTIONS} />
        </ControlGroup>
      </div>
      <FormStatus state={state} />
      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? 'Recording…' : 'Record booking'}
      </Button>
    </form>
  );
};

type BlackoutFormProps = {
  venueId: number;
  courts: CourtOption[];
  action: DeskAction;
};

export const BlackoutForm = ({ venueId, courts, action }: BlackoutFormProps) => {
  const [state, formAction, isPending] = useActionState(action, {});
  const courtOptions = toCourtOptions(courts);

  const handleSubmit = (formData: FormData) => {
    formData.set('startIso', toUtcIso(String(formData.get('startLocal') ?? '')));
    formData.set('endIso', toUtcIso(String(formData.get('endLocal') ?? '')));
    formAction(formData);
  };

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <input type="hidden" name="venueId" value={venueId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <ControlGroup label="Court">
          <SelectField name="courtId" defaultValue={courtOptions[0]?.value} options={courtOptions} />
        </ControlGroup>
        <FormField label="Reason">
          <Input name="reason" required placeholder="Resurfacing" />
        </FormField>
        <FormField label="From">
          <DateTimeInput name="startLocal" />
        </FormField>
        <FormField label="Until">
          <DateTimeInput name="endLocal" />
        </FormField>
      </div>
      <FormStatus state={state} />
      <Button type="submit" variant="outline" disabled={isPending} className="w-fit">
        {isPending ? 'Blocking…' : 'Block court'}
      </Button>
    </form>
  );
};

type PaymentFormProps = {
  venueId: number;
  bookingId: number;
  outstandingPesos: number;
  action: DeskAction;
};

export const PaymentForm = ({ venueId, bookingId, outstandingPesos, action }: PaymentFormProps) => {
  const [state, formAction, isPending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="venueId" value={venueId} />
      <input type="hidden" name="bookingId" value={bookingId} />
      <Input
        type="number"
        name="amountPesos"
        step="0.01"
        min="0.01"
        defaultValue={outstandingPesos.toFixed(2)}
        className="w-28"
        aria-label="Amount in pesos"
      />
      <SelectField name="method" defaultValue="cash" options={PAYMENT_METHOD_OPTIONS} className="w-28" />
      <Button type="submit" disabled={isPending}>
        {isPending ? '…' : 'Take payment'}
      </Button>
      {state.error ? (
        <span role="alert" className="text-destructive text-xs font-medium">
          {state.error}
        </span>
      ) : null}
    </form>
  );
};

/**
 * The desk's record of somebody who did not turn up. A button rather than a dropdown of
 * outcomes: it is the only status the desk sets by hand, and the rest are consequences of
 * actions elsewhere.
 *
 * No confirm dialog, deliberately. It is reversible by the venue at the counter and a modal
 * for a single-click record slows down the one moment the desk is busiest.
 */
export const NoShowForm = ({
  venueId,
  bookingId,
  action,
}: {
  venueId: number;
  bookingId: number;
  action: DeskAction;
}) => {
  const [state, formAction, isPending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-1">
      <input type="hidden" name="venueId" value={venueId} />
      <input type="hidden" name="bookingId" value={bookingId} />
      <Button type="submit" variant="outline" size="sm" disabled={isPending}>
        {isPending ? 'Marking…' : 'No-show'}
      </Button>
      {state.error ? (
        <span role="alert" className="text-destructive text-[11px] font-medium">
          {state.error}
        </span>
      ) : null}
    </form>
  );
};
