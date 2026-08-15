export type OpeningWindow = {
  courtId: number;
  /** 0 = Monday, venue-local. See MONDAY_INDEX in src/consts.ts. */
  dayOfWeek: number;
  /** Venue-local wall-clock time, 'HH:mm' or 'HH:mm:ss'. */
  startsAt: string;
  durationMinutes: number;
};

export type Interval = {
  /** Inclusive start, epoch milliseconds UTC. */
  start: number;
  /** Exclusive end, epoch milliseconds UTC. */
  end: number;
};

export type BlockedInterval = Interval & {
  courtId: number;
};

export type CourtAvailability = {
  courtId: number;
  /** Maximal free intervals, sorted, non-overlapping, non-adjacent. */
  free: Interval[];
};
