'use client';

import { useState } from 'react';

import type { VenueScheduleResponse } from '@courte/contract';

import { FieldLabel } from '@/components/atoms/FieldLabel';
import type { CreateSeriesFormState } from '@/server-actions/createSeries';
import type { PlaceHoldFormState } from '@/server-actions/placeHold';

import { BookingPanel } from './BookingPanel';
import { ScheduleGrid, type SlotSelection } from './ScheduleGrid';

type VenueScheduleProps = {
  schedule: VenueScheduleResponse;
  dayLabel: string;
  /** A start carried in from a search result chip, if it is still offerable. */
  preselected: SlotSelection | null;
  holdAction: (state: PlaceHoldFormState, formData: FormData) => Promise<PlaceHoldFormState>;
  seriesAction: (state: CreateSeriesFormState, formData: FormData) => Promise<CreateSeriesFormState>;
};

/**
 * Two swatches, not three. Every unbookable cell now prints its own reason — Booked, Closed or
 * Past — so a third swatch would be a key to a colour that no longer carries the meaning.
 */
const LEGEND = [
  { className: 'bg-primary', label: 'Selected' },
  { className: 'border-border border bg-white', label: 'Available — the price is that hour’s rate' },
] as const;

const Legend = () => (
  <ul className="text-muted-foreground mt-3.5 flex flex-wrap gap-5 text-[11.5px] font-medium">
    {LEGEND.map(entry => (
      <li key={entry.label} className="flex items-center gap-2">
        <span className={`size-3 rounded-[3px] ${entry.className}`} aria-hidden />
        {entry.label}
      </li>
    ))}
    <li>Grey cells say why: Booked, Closed, or crossed out for an hour that has gone.</li>
  </ul>
);

/**
 * Owns the one piece of state the two halves share: which cell is picked. The grid writes it,
 * the summary panel reads it, and nothing else on the page needs to know — which is why the
 * client boundary sits here rather than around the whole route.
 */
export const VenueSchedule = ({ schedule, dayLabel, preselected, holdAction, seriesAction }: VenueScheduleProps) => {
  const [selection, setSelection] = useState<SlotSelection | null>(preselected);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-10">
      <div className="min-w-0">
        <FieldLabel className="mb-3.5 block">Pick your slot — {dayLabel}</FieldLabel>
        <ScheduleGrid
          courts={schedule.courts}
          hourIsos={schedule.hourIsos}
          timezone={schedule.venueTimezone}
          selection={selection}
          onSelect={setSelection}
        />
        <Legend />
      </div>

      <div className="lg:sticky lg:top-6 lg:self-start">
        <BookingPanel
          courts={schedule.courts}
          timezone={schedule.venueTimezone}
          selection={selection}
          holdAction={holdAction}
          seriesAction={seriesAction}
        />
      </div>
    </div>
  );
};
