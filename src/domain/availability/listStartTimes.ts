import type { Interval } from './types';

/**
 * Derives bookable start times from free intervals: within each free stretch, starts step by
 * the court's increment from the stretch's own start. Opening windows begin on round clock
 * times (10:00), so chips land on :00/:30 without any timezone arithmetic here.
 */

export type ListStartTimesParams = {
  free: Interval[];
  durationMinutes: number;
  incrementMinutes: number;
  /** Starts earlier than this are suppressed (now, for today's chips). */
  notBefore: number;
  limit: number;
};

export const listStartTimes = (params: ListStartTimesParams): number[] => {
  const durationMs = params.durationMinutes * 60_000;
  const incrementMs = params.incrementMinutes * 60_000;
  const starts: number[] = [];

  for (const interval of params.free) {
    for (let start = interval.start; start + durationMs <= interval.end; start += incrementMs) {
      if (start < params.notBefore) continue;
      starts.push(start);
      if (starts.length >= params.limit) return starts;
    }
  }

  return starts;
};
