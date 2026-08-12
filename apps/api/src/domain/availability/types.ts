export type OpeningWindow = {
  courtId: string;
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
  courtId: string;
};

export type CourtAvailability = {
  courtId: string;
  /** Maximal free intervals, sorted, non-overlapping, non-adjacent. */
  free: Interval[];
};
