'use client';

import type { VenueScheduleCourt } from '@courte/contract';

import { formatTime, formatWholePesos } from '@/lib/format';
import { cn } from '@/lib/utils';

export type SlotSelection = {
  courtId: string;
  startIso: string;
};

type ScheduleGridProps = {
  courts: VenueScheduleCourt[];
  hourIsos: string[];
  timezone: string;
  selection: SlotSelection | null;
  onSelect: (selection: SlotSelection) => void;
};

const CELL_BASE = 'w-full rounded-md py-2.5 text-center text-[11.5px] font-semibold transition';

/**
 * Every court at the venue against every open hour. It is the screen's main instrument: a
 * reader is choosing a time first and a court second, and a per-court list makes that
 * comparison impossible.
 *
 * Scrolls horizontally rather than dropping columns — a venue open 6am to midnight has
 * eighteen of them, and hiding the ends would hide exactly the cheap off-peak hours.
 */
export const ScheduleGrid = ({ courts, hourIsos, timezone, selection, onSelect }: ScheduleGridProps) => {
  if (hourIsos.length === 0) {
    return <p className="text-muted-foreground border-border rounded-md border p-6 text-sm">Closed all day.</p>;
  }

  return (
    <div className="border-border overflow-x-auto rounded-md border">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-muted border-border border-b">
            <th className="text-muted-foreground sticky left-0 z-10 bg-inherit px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.08em]">
              Court
            </th>
            {hourIsos.map(hourIso => (
              <th
                key={hourIso}
                className="text-muted-foreground min-w-[74px] px-2 py-3 text-center text-[10px] font-bold uppercase tracking-[0.08em]"
              >
                {formatTime(new Date(hourIso), timezone)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {courts.map(court => (
            <tr key={court.id} className="border-border border-b last:border-b-0">
              <th
                scope="row"
                className="bg-background sticky left-0 z-10 whitespace-nowrap px-3 py-3 text-left text-[12.5px] font-bold"
              >
                {court.name}
              </th>

              {court.cells.map(cell => {
                const isSelected = selection?.courtId === court.id && selection.startIso === cell.startIso;
                const isOpen = cell.state === 'open';
                const label = formatTime(new Date(cell.startIso), timezone);

                return (
                  <td key={cell.startIso} className="border-border border-l p-1.5">
                    {isOpen ? (
                      <button
                        type="button"
                        aria-pressed={isSelected}
                        aria-label={`${court.name}, ${label}`}
                        onClick={() => onSelect({ courtId: court.id, startIso: cell.startIso })}
                        className={cn(
                          CELL_BASE,
                          isSelected
                            ? 'bg-primary text-white'
                            : 'border-border hover:border-primary hover:bg-accent border'
                        )}
                      >
                        {cell.ratePerHourCents === null ? '—' : formatWholePesos(cell.ratePerHourCents)}
                      </button>
                    ) : (
                      <span
                        aria-label={`${court.name}, ${label}, ${cell.state === 'booked' ? 'booked' : 'unavailable'}`}
                        className={cn(CELL_BASE, 'bg-muted text-muted-foreground block')}
                      >
                        {cell.state === 'booked' ? '—' : ''}
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
