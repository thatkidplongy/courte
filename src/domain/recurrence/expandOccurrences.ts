import { DateTime } from 'luxon';
import { RRule } from 'rrule';

import type { Interval } from '@/domain/availability/types';

/**
 * RRULE expansion with the timezone handled correctly, in exactly one place.
 *
 * The rrule library computes in a floating, zoneless timeline. The only safe way to use it
 * with a real zone is the fake-UTC dance: feed it the venue-local wall-clock fields
 * pretending they are UTC, let it iterate, then reinterpret each result's UTC fields as
 * wall-clock time back in the venue zone. "Every Tuesday 19:00" then stays 19:00 local
 * across DST transitions — which is what a court booking means — instead of drifting an
 * hour the way naive UTC maths would.
 */

const toFakeUtc = (wallClock: DateTime): Date =>
  new Date(
    Date.UTC(wallClock.year, wallClock.month - 1, wallClock.day, wallClock.hour, wallClock.minute, wallClock.second)
  );

const fromFakeUtc = (fake: Date, timezone: string): DateTime =>
  DateTime.fromObject(
    {
      year: fake.getUTCFullYear(),
      month: fake.getUTCMonth() + 1,
      day: fake.getUTCDate(),
      hour: fake.getUTCHours(),
      minute: fake.getUTCMinutes(),
      second: fake.getUTCSeconds(),
    },
    { zone: timezone }
  );

export type ExpandParams = {
  /** RRULE body only (e.g. 'FREQ=WEEKLY;BYDAY=TU') — dtstart is its own column, never baked in. */
  rrule: string;
  timezone: string;
  dtstart: Date;
  durationMinutes: number;
  /** Real-instant window; occurrences starting inside it are returned. */
  window: Interval;
};

export type Occurrence = {
  start: Date;
  end: Date;
};

export const expandOccurrences = (params: ExpandParams): Occurrence[] => {
  const localStart = DateTime.fromJSDate(params.dtstart).setZone(params.timezone);

  const rule = new RRule({
    ...RRule.parseString(params.rrule),
    dtstart: toFakeUtc(localStart),
  });

  // The window's edges also cross into fake-UTC as wall-clock in the venue zone, so the
  // comparison happens in the same floating timeline the rule iterates in.
  const fakeFrom = toFakeUtc(DateTime.fromMillis(params.window.start).setZone(params.timezone));
  const fakeTo = toFakeUtc(DateTime.fromMillis(params.window.end).setZone(params.timezone));

  return rule.between(fakeFrom, fakeTo, true).map(fake => {
    const start = fromFakeUtc(fake, params.timezone);
    return {
      start: start.toJSDate(),
      end: start.plus({ minutes: params.durationMinutes }).toJSDate(),
    };
  });
};

export type SplitParams = {
  rrule: string;
  timezone: string;
  /** The first occurrence that moves to the NEW series ("this and following"). */
  splitAt: Date;
};

export type SplitResult = {
  /** The original rule, capped so it stops strictly before the split point. */
  cappedRrule: string;
  /** dtstart for the successor series. */
  newDtstart: Date;
};

/**
 * "This and following" is a series split, the same way CalDAV models it: the old rule gets
 * an UNTIL one second before the split occurrence (UNTIL is inclusive, and it compares in
 * the fake-UTC timeline the rule iterates in), and the successor series starts at the split.
 */
export const splitRrule = (params: SplitParams): SplitResult => {
  const localSplit = DateTime.fromJSDate(params.splitAt).setZone(params.timezone);
  const until = new Date(toFakeUtc(localSplit).getTime() - 1000);

  const options = { ...RRule.parseString(params.rrule), until };

  return {
    cappedRrule: RRule.optionsToString(options).replace(/^RRULE:/, ''),
    newDtstart: params.splitAt,
  };
};
