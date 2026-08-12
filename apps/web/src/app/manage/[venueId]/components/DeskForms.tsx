'use client';

import { useActionState } from 'react';

import { DateTime } from 'luxon';

import type { ManageFormState } from '@/server-actions/manageVenue';

type CourtOption = {
  id: string;
  name: string;
};

type DeskAction = (state: ManageFormState, formData: FormData) => Promise<ManageFormState>;

const FormStatus = ({ state }: { state: ManageFormState }) => {
  if (state.error) {
    return <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">{state.error}</p>;
  }
  if (state.ok) {
    return <p className="bg-court-50 text-court-800 rounded-xl px-4 py-2.5 text-sm font-medium">Done.</p>;
  }
  return null;
};

const toUtcIso = (local: string): string => {
  const parsed = DateTime.fromISO(local);
  return parsed.toUTC().toISO() ?? '';
};

type WalkInFormProps = {
  venueId: string;
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

  const handleSubmit = (formData: FormData) => {
    formData.set('startIso', toUtcIso(String(formData.get('startLocal') ?? '')));
    formAction(formData);
  };

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <input type="hidden" name="venueId" value={venueId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="field-label">Customer</span>
          <input name="customerName" required placeholder="Maria Santos" className="input" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="field-label">Court</span>
          <select name="courtId" className="input">
            {courts.map(court => (
              <option key={court.id} value={court.id}>
                {court.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="field-label">Start</span>
          <input type="datetime-local" name="startLocal" required className="input" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="field-label">Duration</span>
          <select name="durationMinutes" className="input">
            <option value="60">1 h</option>
            <option value="90">90 min</option>
            <option value="120">2 h</option>
            <option value="180">3 h</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="field-label">Source</span>
          <select name="source" className="input">
            <option value="walk_in">Walk-in</option>
            <option value="phone">Phone</option>
          </select>
        </label>
      </div>
      <FormStatus state={state} />
      <button type="submit" disabled={isPending} className="btn-primary w-fit">
        {isPending ? 'Recording…' : 'Record booking'}
      </button>
    </form>
  );
};

type BlackoutFormProps = {
  venueId: string;
  courts: CourtOption[];
  action: DeskAction;
};

export const BlackoutForm = ({ venueId, courts, action }: BlackoutFormProps) => {
  const [state, formAction, isPending] = useActionState(action, {});

  const handleSubmit = (formData: FormData) => {
    formData.set('startIso', toUtcIso(String(formData.get('startLocal') ?? '')));
    formData.set('endIso', toUtcIso(String(formData.get('endLocal') ?? '')));
    formAction(formData);
  };

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <input type="hidden" name="venueId" value={venueId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="field-label">Court</span>
          <select name="courtId" className="input">
            {courts.map(court => (
              <option key={court.id} value={court.id}>
                {court.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="field-label">Reason</span>
          <input name="reason" required placeholder="Resurfacing" className="input" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="field-label">From</span>
          <input type="datetime-local" name="startLocal" required className="input" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="field-label">Until</span>
          <input type="datetime-local" name="endLocal" required className="input" />
        </label>
      </div>
      <FormStatus state={state} />
      <button type="submit" disabled={isPending} className="btn-outline w-fit">
        {isPending ? 'Blocking…' : 'Block court'}
      </button>
    </form>
  );
};

type PaymentFormProps = {
  venueId: string;
  bookingId: string;
  outstandingPesos: number;
  action: DeskAction;
};

export const PaymentForm = ({ venueId, bookingId, outstandingPesos, action }: PaymentFormProps) => {
  const [state, formAction, isPending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="venueId" value={venueId} />
      <input type="hidden" name="bookingId" value={bookingId} />
      <input
        type="number"
        name="amountPesos"
        step="0.01"
        min="0.01"
        defaultValue={outstandingPesos.toFixed(2)}
        className="input w-28 py-1.5"
        aria-label="Amount in pesos"
      />
      <select name="method" className="input w-fit py-1.5" aria-label="Payment method">
        <option value="cash">Cash</option>
        <option value="gcash">GCash</option>
        <option value="maya">Maya</option>
        <option value="card">Card</option>
      </select>
      <button type="submit" disabled={isPending} className="btn-primary px-4 py-1.5">
        {isPending ? '…' : 'Take payment'}
      </button>
      {state.error ? <span className="text-xs font-medium text-red-600">{state.error}</span> : null}
    </form>
  );
};
