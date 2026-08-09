'use client';

import { useActionState } from 'react';

import type { CancelFormState } from '@/server-actions/cancelBooking';

type CancelFormProps = {
  bookingId: string;
  action: (state: CancelFormState, formData: FormData) => Promise<CancelFormState>;
};

export const CancelForm = ({ bookingId, action }: CancelFormProps) => {
  const [state, formAction, isPending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col items-end gap-1.5">
      <input type="hidden" name="bookingId" value={bookingId} />
      <button
        type="submit"
        disabled={isPending}
        className="rounded-full border border-neutral-200 px-4 py-1.5 text-sm font-medium text-neutral-500 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:opacity-40"
      >
        {isPending ? 'Cancelling…' : 'Cancel'}
      </button>
      {state.error ? <p className="max-w-52 text-right text-xs font-medium text-red-600">{state.error}</p> : null}
    </form>
  );
};
