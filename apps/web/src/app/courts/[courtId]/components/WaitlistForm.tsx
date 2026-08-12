'use client';

import { useActionState } from 'react';

import type { JoinWaitlistFormState } from '@/server-actions/joinWaitlist';

export type WindowOption = {
  iso: string;
  label: string;
};

type WaitlistFormProps = {
  courtId: string;
  /** Hour boundaries across the day, venue-local labels with UTC iso values. */
  hourOptions: WindowOption[];
  action: (state: JoinWaitlistFormState, formData: FormData) => Promise<JoinWaitlistFormState>;
};

export const WaitlistForm = ({ courtId, hourOptions, action }: WaitlistFormProps) => {
  const [state, formAction, isPending] = useActionState(action, {});

  if (state.ok) {
    return (
      <p className="bg-court-50 text-court-800 rounded-xl px-5 py-4 text-sm font-medium">
        You&apos;re on the waitlist — if a slot opens in your window, it lands in My bookings with a claim timer.
      </p>
    );
  }

  const defaultEnd = hourOptions[Math.min(hourOptions.length - 1, Math.floor(hourOptions.length / 2) + 2)];

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="courtId" value={courtId} />
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex w-36 flex-col gap-1.5">
          <span className="field-label">From</span>
          <select name="desiredStartIso" className="input">
            {hourOptions.slice(0, -1).map(option => (
              <option key={option.iso} value={option.iso}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex w-36 flex-col gap-1.5">
          <span className="field-label">Until</span>
          <select name="desiredEndIso" defaultValue={defaultEnd?.iso} className="input">
            {hourOptions.slice(1).map(option => (
              <option key={option.iso} value={option.iso}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex w-36 flex-col gap-1.5">
          <span className="field-label">At least</span>
          <select name="minDurationMinutes" className="input">
            <option value="60">1 h</option>
            <option value="90">90 min</option>
            <option value="120">2 h</option>
          </select>
        </label>
        <button type="submit" disabled={isPending} className="btn-outline">
          {isPending ? 'Joining…' : 'Join waitlist'}
        </button>
      </div>
      {state.error ? (
        <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">{state.error}</p>
      ) : null}
    </form>
  );
};
