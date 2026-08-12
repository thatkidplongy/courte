'use client';

import { useActionState, useState } from 'react';

import Link from 'next/link';

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

const REPEAT_OPTIONS = [
  { weeks: 1, label: 'Just once' },
  { weeks: 4, label: 'Weekly · 4 weeks' },
  { weeks: 8, label: 'Weekly · 8 weeks' },
  { weeks: 12, label: 'Weekly · 12 weeks' },
] as const;

type BookingFormProps = {
  courtId: string;
  slots: SlotOption[];
  durations: DurationOption[];
  preselectedStartIso: string | null;
  action: (state: PlaceHoldFormState, formData: FormData) => Promise<PlaceHoldFormState>;
  seriesAction: (state: CreateSeriesFormState, formData: FormData) => Promise<CreateSeriesFormState>;
};

const NoSlotsState = () => (
  <div className="py-6 text-center">
    <p className="font-medium text-neutral-700">Fully booked</p>
    <p className="mt-1 text-sm text-neutral-500">No free times left on this day — join the waitlist below.</p>
  </div>
);

const SeriesSummary = ({ summary }: { summary: NonNullable<CreateSeriesFormState['summary']> }) => (
  <div className="bg-court-50 rounded-xl px-5 py-4 text-sm">
    <p className="text-court-800 font-semibold">
      Booked {summary.created} of {summary.requested} weeks 🎉
    </p>
    {summary.conflicts.length > 0 ? (
      <p className="text-court-800/80 mt-1">Already taken: {summary.conflicts.join(' · ')}</p>
    ) : null}
    <Link href="/bookings" className="text-court-700 mt-2 inline-block font-semibold underline underline-offset-2">
      View my bookings →
    </Link>
  </div>
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
  const [weeks, setWeeks] = useState(1);

  if (slots.length === 0) return <NoSlotsState />;

  const isPending = isHoldPending || isSeriesPending;
  const isRepeating = weeks > 1;
  const error = holdState.error ?? seriesState.error;

  return (
    <form action={isRepeating ? submitSeries : holdAction} className="flex flex-col gap-6">
      <input type="hidden" name="courtId" value={courtId} />
      <input type="hidden" name="startIso" value={selectedStart ?? ''} />
      <input type="hidden" name="weeks" value={weeks} />

      <fieldset>
        <legend className="field-label mb-3">Start time</legend>
        <div className="flex flex-wrap gap-2">
          {slots.map(slot => {
            const isSelected = slot.startIso === selectedStart;
            return (
              <button
                key={slot.startIso}
                type="button"
                onClick={() => setSelectedStart(slot.startIso)}
                className={isSelected ? 'chip-selected' : 'chip'}
              >
                {slot.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="flex flex-wrap gap-4">
        <label className="flex w-40 flex-col gap-1.5">
          <span className="field-label">Duration</span>
          <select name="durationMinutes" className="input">
            {durations.map(duration => (
              <option key={duration.minutes} value={duration.minutes}>
                {duration.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex w-48 flex-col gap-1.5">
          <span className="field-label">Repeat</span>
          <select value={weeks} onChange={event => setWeeks(Number(event.target.value))} className="input">
            {REPEAT_OPTIONS.map(option => (
              <option key={option.weeks} value={option.weeks}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">{error}</p> : null}
      {seriesState.summary ? <SeriesSummary summary={seriesState.summary} /> : null}

      <button type="submit" disabled={selectedStart === null || isPending} className="btn-primary w-fit px-8">
        {isPending && 'Booking…'}
        {!isPending && (isRepeating ? `Book ${weeks} weeks` : 'Book this court')}
      </button>
      {isRepeating ? (
        <p className="-mt-3 text-xs text-neutral-400">
          Clear weeks book instantly; any clashing weeks are listed so you can rebook them elsewhere.
        </p>
      ) : null}
    </form>
  );
};
