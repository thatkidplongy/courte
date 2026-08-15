'use client';

import { useActionState, useMemo, useState } from 'react';

import { DateTime } from 'luxon';

import type { VenueScheduleCourt } from '@courte/contract';

import { ArrowRightIcon } from '@/components/atoms/Icon';
import { Notice } from '@/components/atoms/Notice';
import { ControlGroup } from '@/components/molecules/ControlGroup';
import { SelectField, type SelectOption } from '@/components/molecules/SelectField';
import { Button } from '@/components/shadcn/ui/button';
import { COURT_SURFACE_LABELS } from '@/consts';
import { formatWholePesos } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { CreateSeriesFormState } from '@/server-actions/createSeries';
import type { PlaceHoldFormState } from '@/server-actions/placeHold';

import type { SlotSelection } from './ScheduleGrid';

const REPEAT_OPTIONS: SelectOption[] = [
  { value: '1', label: 'Just once' },
  { value: '4', label: 'Weekly · 4 weeks' },
  { value: '8', label: 'Weekly · 8 weeks' },
  { value: '12', label: 'Weekly · 12 weeks' },
];

type BookingPanelProps = {
  courts: VenueScheduleCourt[];
  timezone: string;
  selection: SlotSelection | null;
  holdAction: (state: PlaceHoldFormState, formData: FormData) => Promise<PlaceHoldFormState>;
  seriesAction: (state: CreateSeriesFormState, formData: FormData) => Promise<CreateSeriesFormState>;
};

const buildDurations = (court: VenueScheduleCourt | undefined): number[] => {
  if (!court) return [];

  const durations: number[] = [];
  for (let minutes = court.minDurationMinutes; minutes <= court.maxDurationMinutes; minutes += court.incrementMinutes) {
    durations.push(minutes);
  }
  return durations;
};

const formatDuration = (minutes: number): string => (minutes % 60 === 0 ? `${minutes / 60} hr` : `${minutes} min`);

const EmptySelection = () => (
  <div className="border-ink rounded-md border-2 p-6">
    <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-[0.14em]">Your booking</p>
    <p className="mt-4 text-lg font-extrabold tracking-tight">Pick a time</p>
    <p className="text-muted-foreground mt-2 text-[13px]">
      Choose any open cell in the grid and the details land here.
    </p>
  </div>
);

/**
 * The sticky summary. It shows the hourly rate the grid cell quoted and stops there: the
 * booking total is resolved server-side at checkout, where a booking crossing a peak boundary
 * is priced per segment. Multiplying a single hour's rate by the duration here would be a
 * second, worse pricing implementation that quietly disagrees with the real one.
 */
export const BookingPanel = ({ courts, timezone, selection, holdAction, seriesAction }: BookingPanelProps) => {
  const [hold, submitHold, isHoldPending] = useActionState(holdAction, {});
  const [series, submitSeries, isSeriesPending] = useActionState(seriesAction, {});
  const [durationMinutes, setDurationMinutes] = useState<string | null>(null);
  const [weeks, setWeeks] = useState('1');

  const court = courts.find(candidate => candidate.id === selection?.courtId);
  const cell = court?.cells.find(candidate => candidate.startIso === selection?.startIso);
  const durations = useMemo(() => buildDurations(court), [court]);
  const resolvedDuration = durationMinutes ?? String(durations[0] ?? '');

  if (!selection || !court || !cell) return <EmptySelection />;

  const isRepeating = Number(weeks) > 1;
  const isPending = isHoldPending || isSeriesPending;
  const error = hold.error ?? series.error;
  const start = DateTime.fromISO(selection.startIso).setZone(timezone);

  return (
    <form action={isRepeating ? submitSeries : submitHold} className="border-ink rounded-md border-2 p-6">
      <input type="hidden" name="courtId" value={court.id} />
      <input type="hidden" name="startIso" value={selection.startIso} />
      <input type="hidden" name="durationMinutes" value={resolvedDuration} />
      <input type="hidden" name="weeks" value={weeks} />

      <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-[0.14em]">Your booking</p>
      <p className="mt-4 text-2xl font-extrabold leading-tight tracking-tight">
        {start.toFormat('ccc d LLL')} · {start.toFormat('h:mm a')}
      </p>
      <p className="text-muted-foreground mt-2 text-[13px] font-medium">
        {court.name} · {COURT_SURFACE_LABELS[court.surface]}
      </p>

      <div className="mt-5 flex flex-wrap gap-1.5">
        {durations.map(minutes => {
          const isActive = String(minutes) === resolvedDuration;

          return (
            <button
              key={minutes}
              type="button"
              aria-pressed={isActive}
              onClick={() => setDurationMinutes(String(minutes))}
              className={cn(
                'rounded-md border px-3 py-2 text-xs font-semibold transition',
                isActive ? 'border-ink bg-ink text-white' : 'border-border hover:border-primary'
              )}
            >
              {formatDuration(minutes)}
            </button>
          );
        })}
      </div>

      <div className="border-border mt-5 border-t pt-4">
        <ControlGroup label="Repeat">
          <SelectField value={weeks} onValueChange={setWeeks} options={REPEAT_OPTIONS} />
        </ControlGroup>
      </div>

      {cell.ratePerHourCents === null ? null : (
        <div className="border-ink mt-5 flex items-baseline justify-between border-t-2 pt-4">
          <span className="text-[13px] font-bold">Rate</span>
          <span className="text-2xl font-extrabold tracking-tight">
            {formatWholePesos(cell.ratePerHourCents)}
            <span className="text-muted-foreground ml-1 text-[11px] font-medium">/hr</span>
          </span>
        </div>
      )}

      {error ? (
        <Notice tone="error" className="mt-4">
          {error}
        </Notice>
      ) : null}
      {series.summary ? (
        <Notice tone="success" className="mt-4">
          Booked {series.summary.created} of {series.summary.requested} weeks
          {series.summary.conflicts.length > 0 ? ` · clashes: ${series.summary.conflicts.join(', ')}` : ''}
        </Notice>
      ) : null}

      <Button type="submit" size="lg" disabled={isPending} className="mt-5 w-full justify-between">
        {isPending ? 'Holding…' : isRepeating ? `Book ${weeks} weeks` : 'Continue to payment'}
        <ArrowRightIcon className="h-4 w-4" />
      </Button>
      <p className="text-muted-foreground mt-3 text-[11.5px] font-medium">
        The total is quoted at checkout, where an hour crossing a peak boundary is priced per segment.
      </p>
    </form>
  );
};
