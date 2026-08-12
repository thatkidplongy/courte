'use client';

import { useActionState, useEffect, useState } from 'react';

import { ClockIcon } from '@/components/icons';
import type { ConfirmFormState } from '@/server-actions/confirmBooking';

type ConfirmPanelProps = {
  bookingId: string;
  expiresAtIso: string;
  action: (state: ConfirmFormState, formData: FormData) => Promise<ConfirmFormState>;
};

const formatRemaining = (ms: number): string => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

const HoldLapsedState = () => (
  <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
    Your hold has expired — head back and pick a fresh slot.
  </p>
);

export const ConfirmPanel = ({ bookingId, expiresAtIso, action }: ConfirmPanelProps) => {
  const [state, formAction, isPending] = useActionState(action, {});
  const [remainingMs, setRemainingMs] = useState(() => Date.parse(expiresAtIso) - Date.now());

  useEffect(() => {
    const timer = setInterval(() => setRemainingMs(Date.parse(expiresAtIso) - Date.now()), 1000);
    return () => clearInterval(timer);
  }, [expiresAtIso]);

  if (remainingMs <= 0) return <HoldLapsedState />;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="bookingId" value={bookingId} />
      <p className="bg-court-50 text-court-800 flex w-fit items-center gap-2 rounded-full px-4 py-2 text-sm font-medium">
        <ClockIcon className="h-4 w-4" />
        Slot held for <span className="font-mono text-base font-bold tabular-nums">{formatRemaining(remainingMs)}</span>
      </p>
      {state.error ? (
        <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">{state.error}</p>
      ) : null}
      <button type="submit" disabled={isPending} className="btn-primary w-full py-3 text-base">
        {isPending ? 'Confirming…' : 'Confirm booking'}
      </button>
      <p className="text-center text-xs text-neutral-400">Pay at the venue — cash, GCash or Maya.</p>
    </form>
  );
};
