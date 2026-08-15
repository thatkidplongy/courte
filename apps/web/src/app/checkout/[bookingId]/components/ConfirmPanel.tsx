'use client';

import { useActionState, useEffect, useState } from 'react';

import { ClockIcon } from '@/components/atoms/Icon';
import { Notice } from '@/components/atoms/Notice';
import { Button } from '@/components/shadcn/ui/button';
import type { ConfirmFormState } from '@/server-actions/confirmBooking';

type ConfirmPanelProps = {
  bookingId: number;
  expiresAtIso: string;
  action: (state: ConfirmFormState, formData: FormData) => Promise<ConfirmFormState>;
};

const formatRemaining = (ms: number): string => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

const HoldLapsedState = () => <Notice tone="error">Your hold has expired — head back and pick a fresh slot.</Notice>;

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
      <p className="bg-accent text-accent-foreground flex w-fit items-center gap-2 rounded-md px-3.5 py-2 text-[13px] font-semibold">
        <ClockIcon className="h-4 w-4" />
        Slot held for <span className="text-base font-extrabold tabular-nums">{formatRemaining(remainingMs)}</span>
      </p>
      {state.error ? <Notice tone="error">{state.error}</Notice> : null}
      {/* Flush left with the amount pushed right — the design's rule for a button wider than
          its label, and it puts the number being committed to at the edge of the click. */}
      <Button type="submit" size="lg" disabled={isPending} className="w-full justify-start text-[15px]">
        {isPending ? 'Confirming…' : 'Confirm booking'}
      </Button>
      <p className="text-muted-foreground text-xs">Pay at the venue — cash, GCash or Maya.</p>
    </form>
  );
};
