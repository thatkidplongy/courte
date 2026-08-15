'use client';

import { useActionState } from 'react';

import { Notice } from '@/components/atoms/Notice';
import { ControlGroup } from '@/components/molecules/ControlGroup';
import { SelectField, type SelectOption } from '@/components/molecules/SelectField';
import { Button } from '@/components/shadcn/ui/button';
import type { JoinWaitlistFormState } from '@/server-actions/joinWaitlist';

export type WindowOption = {
  iso: string;
  label: string;
};

const MIN_DURATION_OPTIONS: SelectOption[] = [
  { value: '60', label: '1 h' },
  { value: '90', label: '90 min' },
  { value: '120', label: '2 h' },
];

type WaitlistFormProps = {
  courtId: string;
  /** Hour boundaries across the day, venue-local labels with UTC iso values. */
  hourOptions: WindowOption[];
  action: (state: JoinWaitlistFormState, formData: FormData) => Promise<JoinWaitlistFormState>;
};

const toSelectOptions = (windows: WindowOption[]): SelectOption[] =>
  windows.map(window => ({ value: window.iso, label: window.label }));

export const WaitlistForm = ({ courtId, hourOptions, action }: WaitlistFormProps) => {
  const [state, formAction, isPending] = useActionState(action, {});

  if (state.ok) {
    return (
      <Notice tone="success">
        You&apos;re on the waitlist — if a slot opens in your window, it lands in My bookings with a claim timer.
      </Notice>
    );
  }

  const fromOptions = toSelectOptions(hourOptions.slice(0, -1));
  const untilOptions = toSelectOptions(hourOptions.slice(1));
  const defaultEnd = untilOptions[Math.min(untilOptions.length - 1, Math.floor(untilOptions.length / 2) + 1)];

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="courtId" value={courtId} />
      <div className="flex flex-wrap items-end gap-4">
        <ControlGroup label="From" className="w-32">
          <SelectField name="desiredStartIso" defaultValue={fromOptions[0]?.value} options={fromOptions} />
        </ControlGroup>
        <ControlGroup label="Until" className="w-32">
          <SelectField name="desiredEndIso" defaultValue={defaultEnd?.value} options={untilOptions} />
        </ControlGroup>
        <ControlGroup label="At least" className="w-32">
          <SelectField name="minDurationMinutes" defaultValue="60" options={MIN_DURATION_OPTIONS} />
        </ControlGroup>
        <Button type="submit" variant="outline" size="lg" disabled={isPending}>
          {isPending ? 'Joining…' : 'Join waitlist'}
        </Button>
      </div>
      {state.error ? <Notice tone="error">{state.error}</Notice> : null}
    </form>
  );
};
