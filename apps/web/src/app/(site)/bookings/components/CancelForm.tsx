'use client';

import { useActionState } from 'react';

import { Button } from '@/components/shadcn/ui/button';
import type { CancelFormState } from '@/server-actions/cancelBooking';

type CancelFormProps = {
  bookingId: string;
  action: (state: CancelFormState, formData: FormData) => Promise<CancelFormState>;
};

export const CancelForm = ({ bookingId, action }: CancelFormProps) => {
  const [state, formAction, isPending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col items-end gap-2">
      <input type="hidden" name="bookingId" value={bookingId} />
      <Button type="submit" variant="destructive" disabled={isPending}>
        {isPending ? 'Cancelling…' : 'Cancel'}
      </Button>
      {state.error ? (
        <p role="alert" className="text-destructive max-w-52 text-right text-xs font-medium">
          {state.error}
        </p>
      ) : null}
    </form>
  );
};
