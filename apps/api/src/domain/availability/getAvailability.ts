import { DateTime } from 'luxon';

import { MONDAY_INDEX } from '@/consts';

import type { BlockedInterval, CourtAvailability, Interval, OpeningWindow } from './types';

/**
 * The availability seam (docs/adr/0001): free time is derived here, on read, from opening
 * windows minus active reservations. Nothing else in the codebase answers "what is free?".
 * If search latency ever demands a materialised read model, it replaces the internals of this
 * module and no caller changes.
 *
 * Pure functions over plain data — callers fetch the inputs. Time is handled in exactly one
 * place: windows are venue-local wall-clock and get projected onto the UTC timeline per
 * calendar day, so a court that is "open 10:00–24:00" stays 10:00–24:00 through a DST shift,
 * and a 24/7 window survives days that are 23 or 25 hours long.
 */

const byStart = (a: Interval, b: Interval): number => a.start - b.start;

export const mergeIntervals = (intervals: Interval[]): Interval[] => {
  if (intervals.length <= 1) return [...intervals].sort(byStart);

  const sorted = [...intervals].sort(byStart);
  const merged: Interval[] = [];

  for (const interval of sorted) {
    const last = merged[merged.length - 1];

    if (last && interval.start <= last.end) {
      last.end = Math.max(last.end, interval.end);
      continue;
    }

    merged.push({ ...interval });
  }

  return merged;
};

export const subtractIntervals = (base: Interval[], holes: Interval[]): Interval[] => {
  if (holes.length === 0) return mergeIntervals(base);

  const mergedHoles = mergeIntervals(holes);
  const result: Interval[] = [];

  for (const interval of mergeIntervals(base)) {
    let cursor = interval.start;

    for (const hole of mergedHoles) {
      if (hole.end <= cursor || hole.start >= interval.end) continue;

      if (hole.start > cursor) result.push({ start: cursor, end: hole.start });
      cursor = Math.max(cursor, hole.end);
    }

    if (cursor < interval.end) result.push({ start: cursor, end: interval.end });
  }

  return result;
};

const toLuxonWeekday = (dayOfWeek: number): number => dayOfWeek - MONDAY_INDEX + 1;

/**
 * Projects a court's weekly windows onto concrete UTC intervals across a query range.
 * Windows anchored on a weekday may spill past midnight (a 24/7 court is one week-long
 * window), so the walk starts a week early to catch spillover into the range.
 */
export const projectWindows = (windows: OpeningWindow[], range: Interval, timezone: string): Interval[] => {
  if (windows.length === 0) return [];

  const projected: Interval[] = [];
  const firstDay = DateTime.fromMillis(range.start, { zone: timezone }).startOf('day').minus({ weeks: 1 });
  const lastDay = DateTime.fromMillis(range.end, { zone: timezone }).startOf('day');

  for (let day = firstDay; day <= lastDay; day = day.plus({ days: 1 })) {
    for (const window of windows) {
      if (toLuxonWeekday(window.dayOfWeek) !== day.weekday) continue;

      const [hourPart, minutePart] = window.startsAt.split(':');
      const start = day.set({ hour: Number(hourPart), minute: Number(minutePart ?? 0), second: 0, millisecond: 0 });
      const end = start.plus({ minutes: window.durationMinutes });

      if (end.toMillis() <= range.start || start.toMillis() >= range.end) continue;

      projected.push({
        start: Math.max(start.toMillis(), range.start),
        end: Math.min(end.toMillis(), range.end),
      });
    }
  }

  return mergeIntervals(projected);
};

export type GetAvailabilityParams = {
  courtIds: number[];
  range: Interval;
  timezone: string;
  windows: OpeningWindow[];
  blocked: BlockedInterval[];
};

export const getAvailability = (params: GetAvailabilityParams): CourtAvailability[] => {
  const windowsByCourt = new Map<number, OpeningWindow[]>();
  for (const window of params.windows) {
    const list = windowsByCourt.get(window.courtId) ?? [];
    list.push(window);
    windowsByCourt.set(window.courtId, list);
  }

  const blockedByCourt = new Map<number, Interval[]>();
  for (const block of params.blocked) {
    const list = blockedByCourt.get(block.courtId) ?? [];
    list.push({ start: block.start, end: block.end });
    blockedByCourt.set(block.courtId, list);
  }

  return params.courtIds.map(courtId => {
    const open = projectWindows(windowsByCourt.get(courtId) ?? [], params.range, params.timezone);
    return { courtId, free: subtractIntervals(open, blockedByCourt.get(courtId) ?? []) };
  });
};

export type FitsParams = {
  availability: CourtAvailability;
  requested: Interval;
};

export const doesSlotFit = ({ availability, requested }: FitsParams): boolean =>
  availability.free.some(interval => interval.start <= requested.start && interval.end >= requested.end);
