'use client';

import { useActionState, useState } from 'react';

import Link from 'next/link';

import { ArrowRightIcon } from '@/components/atoms/Icon';
import { Notice } from '@/components/atoms/Notice';
import { ControlGroup } from '@/components/molecules/ControlGroup';
import { SelectField, type SelectOption } from '@/components/molecules/SelectField';
import { Button } from '@/components/shadcn/ui/button';
import { cn } from '@/lib/utils';
import type { CreateSeriesFormState } from '@/server-actions/createSeries';
import type { PlaceHoldFormState } from '@/server-actions/placeHold';

export type SlotOption = {
  startIso: string;
  label: string;
};

export type DurationOption = {
  minutes: number;
  label: string;
};

const REPEAT_OPTIONS: SelectOption[] = [
  { value: '1', label: 'Just once' },
  { value: '4', label: 'Weekly · 4 weeks' },
  { value: '8', label: 'Weekly · 8 weeks' },
  { value: '12', label: 'Weekly · 12 weeks' },
];

type BookingFormProps = {
  courtId: string;
  slots: SlotOption[];
  durations: DurationOption[];
  preselectedStartIso: string | null;
  action: (state: PlaceHoldFormState, formData: FormData) => Promise<PlaceHoldFormState>;
  seriesAction: (state: CreateSeriesFormState, formData: FormData) => Promise<CreateSeriesFormState>;
};

const NoSlotsState = () => (
  <div className="py-4">
    <p className="font-bold">Fully booked</p>
    <p className="text-muted-foreground mt-1.5 text-sm">No free times left on this day — join the waitlist below.</p>
  </div>
);

type SlotButtonProps = {
  slot: SlotOption;
  isSelected: boolean;
  onSelect: () => void;
};

const SlotButton = ({ slot, isSelected, onSelect }: SlotButtonProps) => (
  <button
    type="button"
    onClick={onSelect}
    aria-pressed={isSelected}
    className={cn(
      'rounded-md border px-3.5 py-2 text-xs font-semibold transition',
      isSelected ? 'border-primary bg-primary text-white' : 'border-border hover:border-primary hover:bg-accent'
    )}
  >
    {slot.label}
  </button>
);

const SeriesSummary = ({ summary }: { summary: NonNullable<CreateSeriesFormState['summary']> }) => (
  <Notice tone="success">
    <p className="font-bold">
      Booked {summary.created} of {summary.requested} weeks
    </p>
    {summary.conflicts.length > 0 ? (
      <p className="mt-1 opacity-80">Already taken: {summary.conflicts.join(' · ')}</p>
    ) : null}
    <Link href="/bookings" className="mt-2.5 inline-flex items-center gap-1.5 font-bold underline underline-offset-2">
      View my bookings
      <ArrowRightIcon className="h-3.5 w-3.5" />
    </Link>
  </Notice>
);

export const BookingForm = ({
  courtId,
  slots,
  durations,
  preselectedStartIso,
  action,
  seriesAction,
}: BookingFormProps) => {
  const [holdState, holdAction, isHoldPending] = useActionState(action, {});
  const [seriesState, submitSeries, isSeriesPending] = useActionState(seriesAction, {});
  const [selectedStart, setSelectedStart] = useState<string | null>(preselectedStartIso);
  const [weeks, setWeeks] = useState('1');

  if (slots.length === 0) return <NoSlotsState />;

  const isPending = isHoldPending || isSeriesPending;
  const isRepeating = Number(weeks) > 1;
  const error = holdState.error ?? seriesState.error;
  const durationOptions: SelectOption[] = durations.map(duration => ({
    value: String(duration.minutes),
    label: duration.label,
  }));

  return (
    <form action={isRepeating ? submitSeries : holdAction} className="flex flex-col gap-6">
      <input type="hidden" name="courtId" value={courtId} />
      <input type="hidden" name="startIso" value={selectedStart ?? ''} />
      <input type="hidden" name="weeks" value={weeks} />

      <fieldset>
        <legend className="text-muted-foreground mb-3 text-[10px] font-semibold uppercase tracking-[0.12em]">
          Start time
        </legend>
        <div className="flex flex-wrap gap-2">
          {slots.map(slot => (
            <SlotButton
              key={slot.startIso}
              slot={slot}
              isSelected={slot.startIso === selectedStart}
              onSelect={() => setSelectedStart(slot.startIso)}
            />
          ))}
        </div>
      </fieldset>

      <div className="flex flex-wrap gap-4">
        <ControlGroup label="Duration" className="w-40">
          <SelectField name="durationMinutes" defaultValue={durationOptions[0]?.value} options={durationOptions} />
        </ControlGroup>

        {/* Not a submitted field — `weeks` travels in the hidden input above. This control
            exists to pick which server action the form posts to. */}
        <ControlGroup label="Repeat" className="w-52">
          <SelectField value={weeks} onValueChange={setWeeks} options={REPEAT_OPTIONS} />
        </ControlGroup>
      </div>

      {error ? <Notice tone="error">{error}</Notice> : null}
      {seriesState.summary ? <SeriesSummary summary={seriesState.summary} /> : null}

      <div>
        <Button type="submit" size="lg" disabled={selectedStart === null || isPending} className="px-8">
          {isPending && 'Booking…'}
          {!isPending && (isRepeating ? `Book ${weeks} weeks` : 'Book this court')}
        </Button>
        {isRepeating ? (
          <p className="text-muted-foreground mt-3 text-xs">
            Clear weeks book instantly; any clashing weeks are listed so you can rebook them elsewhere.
          </p>
        ) : null}
      </div>
    </form>
  );
};
