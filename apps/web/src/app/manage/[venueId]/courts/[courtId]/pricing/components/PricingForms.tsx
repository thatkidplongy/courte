'use client';

import { useActionState } from 'react';

import type { OpeningWindowSummary } from '@courte/contract';

import { Notice } from '@/components/atoms/Notice';
import { ControlGroup } from '@/components/molecules/ControlGroup';
import { FormField } from '@/components/molecules/FormField';
import { SelectField, type SelectOption } from '@/components/molecules/SelectField';
import { Button } from '@/components/shadcn/ui/button';
import { Checkbox } from '@/components/shadcn/ui/checkbox';
import { Input } from '@/components/shadcn/ui/input';
import { ANY_FILTER_VALUE, WEEKDAY_LABELS, WEEKDAYS } from '@/consts';
import type { ManageFormState } from '@/server-actions/manageVenue';

type InventoryAction = (state: ManageFormState, formData: FormData) => Promise<ManageFormState>;

const DAY_OPTIONS: SelectOption[] = [
  { value: ANY_FILTER_VALUE, label: 'Every day' },
  ...WEEKDAYS.map(day => ({ value: String(day), label: WEEKDAY_LABELS[day] })),
];

const FormStatus = ({ state }: { state: ManageFormState }) => {
  if (state.error) return <Notice tone="error">{state.error}</Notice>;
  if (state.ok) return <Notice tone="success">Saved.</Notice>;
  return null;
};

/**
 * Every optional field is genuinely optional, and blank means "any" rather than zero. That is
 * what lets one form express a standing rate, a weekday evening peak and a single public
 * holiday without three different shapes.
 *
 * There is no member-only toggle. `memberOnly` exists in the schema, but every caller resolves
 * quotes with `isMember: false` until venue passes are built, so offering it would let an owner
 * configure a rate that can never be charged.
 */
export const PriceRuleForm = ({
  venueId,
  courtId,
  action,
}: {
  venueId: string;
  courtId: string;
  action: InventoryAction;
}) => {
  const [state, formAction, isPending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="venueId" value={venueId} />
      <input type="hidden" name="courtId" value={courtId} />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Rate per hour (₱)">
          <Input name="ratePerHourPesos" type="number" min={0} step={10} required placeholder="450" />
        </FormField>
        <ControlGroup label="Day">
          <SelectField name="dayOfWeek" defaultValue={ANY_FILTER_VALUE} options={DAY_OPTIONS} />
        </ControlGroup>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="From (optional)">
          <Input name="startsAt" type="time" step={300} />
        </FormField>
        <FormField label="Until (optional)">
          <Input name="endsAt" type="time" step={300} />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="First date (optional)">
          <Input name="validFrom" type="date" />
        </FormField>
        <FormField label="Last date (optional)">
          <Input name="validTo" type="date" />
        </FormField>
      </div>

      <FormField label="Priority">
        <Input name="priority" type="number" min={0} max={1000} defaultValue={0} required />
      </FormField>

      <FormStatus state={state} />

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? 'Adding…' : 'Add rate'}
      </Button>
    </form>
  );
};

export const RemoveRuleButton = ({
  venueId,
  courtId,
  ruleId,
  action,
}: {
  venueId: string;
  courtId: string;
  ruleId: string;
  action: InventoryAction;
}) => {
  const [state, formAction, isPending] = useActionState(action, {});

  return (
    <form action={formAction}>
      <input type="hidden" name="venueId" value={venueId} />
      <input type="hidden" name="courtId" value={courtId} />
      <input type="hidden" name="ruleId" value={ruleId} />

      {state.error ? <span className="text-destructive text-[12px] font-semibold">{state.error}</span> : null}

      <Button type="submit" variant="outline" size="sm" disabled={isPending}>
        Remove
      </Button>
    </form>
  );
};

/**
 * The whole week in one submit, because that is how opening hours are read and reasoned about.
 * An unticked day is a closed day — an absent window, not a zero-length one.
 */
export const OpeningHoursForm = ({
  venueId,
  courtId,
  windows,
  action,
}: {
  venueId: string;
  courtId: string;
  windows: OpeningWindowSummary[];
  action: InventoryAction;
}) => {
  const [state, formAction, isPending] = useActionState(action, {});
  const byDay = new Map(windows.map(window => [window.dayOfWeek, window]));

  return (
    <form action={formAction} className="flex flex-col gap-3.5">
      <input type="hidden" name="venueId" value={venueId} />
      <input type="hidden" name="courtId" value={courtId} />

      {WEEKDAYS.map(day => {
        const window = byDay.get(day);

        return (
          <div key={day} className="flex flex-wrap items-center gap-3">
            <label className="flex w-28 shrink-0 cursor-pointer items-center gap-2.5 text-[13px] font-medium">
              <Checkbox name={`open-${day}`} defaultChecked={window !== undefined} />
              {WEEKDAY_LABELS[day]}
            </label>
            <Input
              name={`startsAt-${day}`}
              type="time"
              step={300}
              defaultValue={window?.startsAt ?? '08:00'}
              className="w-32"
              aria-label={`${WEEKDAY_LABELS[day]} opening time`}
            />
            <Input
              name={`durationMinutes-${day}`}
              type="number"
              min={1}
              max={10080}
              defaultValue={window?.durationMinutes ?? 840}
              className="w-28"
              aria-label={`${WEEKDAY_LABELS[day]} minutes open`}
            />
            <span className="text-muted-foreground text-[11.5px] font-medium">min</span>
          </div>
        );
      })}

      <FormStatus state={state} />

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? 'Saving…' : 'Save hours'}
      </Button>
    </form>
  );
};
