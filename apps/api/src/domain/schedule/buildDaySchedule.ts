import { MINUTES_PER_HOUR, MS_PER_MINUTE } from '@/consts';
import type { Interval } from '@/domain/availability/types';

/**
 * The court-by-hour grid behind the venue page, pure.
 *
 * Four states, and the distinctions between them are the point. `closed` means the venue is not
 * open then, `past` means it was open but the hour has gone, `booked` means it is open and taken,
 * `open` means you can have it. Collapsing any of the three unbookable cases — which a naive
 * "is it in the free list" check does — makes a venue that shuts at 9pm look fully booked all
 * evening, which is a different and much worse claim about someone's business.
 *
 * `past` is split out from `closed` so the grid can name the reason rather than drawing three
 * different situations as the same empty box.
 */

export type ScheduleCellState = 'open' | 'booked' | 'closed' | 'past';

export type ScheduleCell = {
  /** Epoch ms of the hour this cell represents. */
  start: number;
  state: ScheduleCellState;
};

export type ScheduleCourt = {
  courtId: number;
  cells: ScheduleCell[];
};

type ScheduleInput = {
  courts: Array<{ id: number; minDurationMinutes: number }>;
  /** When the court is open, ignoring bookings. */
  openByCourt: Map<number, Interval[]>;
  /** Open minus everything already reserved. */
  freeByCourt: Map<number, Interval[]>;
  /** Epoch ms of each hour column, ascending. */
  hourStarts: number[];
  /** Usually now: an hour that has begun cannot be booked, whatever the calendar says. */
  notBefore: number;
};

const covers = (intervals: Interval[], start: number, end: number): boolean =>
  intervals.some(interval => interval.start <= start && interval.end >= end);

const classifyCell = ({
  hourStart,
  minDurationMinutes,
  open,
  free,
  notBefore,
}: {
  hourStart: number;
  minDurationMinutes: number;
  open: Interval[];
  free: Interval[];
  notBefore: number;
}): ScheduleCellState => {
  const hourEnd = hourStart + MINUTES_PER_HOUR * MS_PER_MINUTE;
  // Opening hours are checked first, so an hour this court was never open for reads as closed
  // even once it is also in the past — that is the more specific fact about this court.
  if (!covers(open, hourStart, hourEnd)) return 'closed';
  if (hourStart < notBefore) return 'past';

  // A bookable hour is one where the court's shortest booking still fits, not merely one where
  // the hour itself is free — a 90-minute-minimum court with a 60-minute gap has nothing to sell.
  const bookableEnd = hourStart + minDurationMinutes * MS_PER_MINUTE;
  return covers(free, hourStart, bookableEnd) ? 'open' : 'booked';
};

export const buildDaySchedule = ({
  courts,
  openByCourt,
  freeByCourt,
  hourStarts,
  notBefore,
}: ScheduleInput): ScheduleCourt[] =>
  courts.map(court => {
    const open = openByCourt.get(court.id) ?? [];
    const free = freeByCourt.get(court.id) ?? [];

    return {
      courtId: court.id,
      cells: hourStarts.map(hourStart => ({
        start: hourStart,
        state: classifyCell({ hourStart, minDurationMinutes: court.minDurationMinutes, open, free, notBefore }),
      })),
    };
  });

/**
 * The hour columns the grid needs: every whole hour any court at the venue is open, as a single
 * ascending run. Taken from the union rather than from one court, so a venue whose show court
 * opens earlier than the rest still gets that hour as a column.
 */
export const listOpenHourStarts = (openIntervals: Interval[], hourAnchors: number[]): number[] =>
  hourAnchors.filter(anchor =>
    openIntervals.some(interval => interval.start < anchor + MINUTES_PER_HOUR * MS_PER_MINUTE && interval.end > anchor)
  );
