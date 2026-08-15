import { DateTime } from 'luxon';

import { MINUTES_PER_DAY } from '@/consts';
import type { Interval } from '@/domain/availability/types';
import { ValidationError } from '@/domain/errors';

/**
 * Quote resolution, pure. A booking's interval is cut into segments wherever the applicable
 * rule could change — at local midnight (day-of-week rules) and at every rule window edge —
 * then each segment is priced by its highest-priority matching rule, pro-rata by the hour.
 * A 16:00–19:00 booking crossing a 17:00 peak boundary genuinely pays base for one hour and
 * peak for two, instead of whichever rate happened to win at the start time.
 *
 * The resulting segment list IS the rate snapshot stored on the booking: the price at time
 * of sale is its own fact, never recomputed from today's rules.
 *
 * Overnight rule windows (22:00–02:00) are not supported: a venue wanting one prices it as
 * two rules. Enforced at rule creation, assumed here.
 */

export type PriceRule = {
  id: number;
  courtId: number;
  priority: number;
  /** 0 = Monday, venue-local; null matches any day. */
  dayOfWeek: number | null;
  /** 'HH:mm' or 'HH:mm:ss' venue-local; null (with endsAt null) matches any time. */
  startsAt: string | null;
  endsAt: string | null;
  /**
   * 'yyyy-MM-dd' venue-local calendar bounds, inclusive at both ends and independently
   * nullable. `validFrom` alone is a price rise, `validTo` alone a promotion, both equal a
   * single holiday, neither the standing rule.
   */
  validFrom: string | null;
  validTo: string | null;
  memberOnly: boolean;
  ratePerHourCents: number;
};

export type QuoteSegment = {
  ruleId: number;
  start: string;
  end: string;
  minutes: number;
  ratePerHourCents: number;
  amountCents: number;
};

export type Quote = {
  totalCents: number;
  snapshot: { segments: QuoteSegment[] };
};

export type ResolveQuoteParams = {
  rules: PriceRule[];
  requested: Interval;
  timezone: string;
  isMember: boolean;
};

const toMinutesOfDay = (time: string): number => {
  const [hours, minutes] = time.split(':');
  return Number(hours) * 60 + Number(minutes ?? 0);
};

const localMinuteOfDay = (dt: DateTime): number => dt.hour * 60 + dt.minute;

const ruleMatchesSegment = (rule: PriceRule, segmentStart: DateTime, isMember: boolean): boolean => {
  if (rule.memberOnly && !isMember) return false;

  // Compared as venue-local calendar dates, and string comparison is exact for 'yyyy-MM-dd'.
  // Doing this in UTC would move a holiday rate by up to a day for any venue east of Greenwich,
  // which is all of them.
  const localDate = segmentStart.toFormat('yyyy-MM-dd');
  if (rule.validFrom !== null && localDate < rule.validFrom) return false;
  if (rule.validTo !== null && localDate > rule.validTo) return false;

  if (rule.dayOfWeek !== null && rule.dayOfWeek !== segmentStart.weekday - 1) return false;

  if (rule.startsAt !== null && rule.endsAt !== null) {
    const minute = localMinuteOfDay(segmentStart);
    // Segments are cut at every window edge, so containment of the start implies
    // containment of the whole segment.
    if (minute < toMinutesOfDay(rule.startsAt) || minute >= toMinutesOfDay(rule.endsAt)) return false;
  }

  return true;
};

const collectCutPoints = (params: ResolveQuoteParams): number[] => {
  const cuts = new Set<number>([params.requested.start, params.requested.end]);

  let day = DateTime.fromMillis(params.requested.start, { zone: params.timezone }).startOf('day');
  const lastDay = DateTime.fromMillis(params.requested.end, { zone: params.timezone }).startOf('day');

  while (day <= lastDay) {
    cuts.add(day.toMillis());

    for (const rule of params.rules) {
      if (rule.startsAt === null || rule.endsAt === null) continue;
      cuts.add(day.plus({ minutes: toMinutesOfDay(rule.startsAt) }).toMillis());
      cuts.add(day.plus({ minutes: toMinutesOfDay(rule.endsAt) }).toMillis());
    }

    day = day.plus({ days: 1 });
  }

  return [...cuts].filter(cut => cut >= params.requested.start && cut <= params.requested.end).sort((a, b) => a - b);
};

export const resolveQuote = (params: ResolveQuoteParams): Quote => {
  if (params.requested.end <= params.requested.start) {
    throw new ValidationError('Quote range must end after it starts');
  }
  if (params.requested.end - params.requested.start > MINUTES_PER_DAY * 60_000) {
    throw new ValidationError('A single booking cannot exceed 24 hours');
  }

  // Sorted here rather than trusting the caller's order, and with an explicit tie-break: a
  // plain `b.priority - a.priority` on a stable sort preserves whatever order the rules
  // arrived in, so two equal-priority rules would resolve differently depending on the query
  // that fetched them. `id` is arbitrary but it is *fixed*, which is the property that matters
  // — genuine ambiguity is refused at write time by assertNoRuleConflict.
  const ranked = [...params.rules].sort((a, b) => b.priority - a.priority || a.id - b.id);
  const cuts = collectCutPoints(params);
  const segments: QuoteSegment[] = [];

  for (let i = 0; i < cuts.length - 1; i++) {
    const start = cuts[i]!;
    const end = cuts[i + 1]!;
    const segmentStart = DateTime.fromMillis(start, { zone: params.timezone });

    const rule = ranked.find(candidate => ruleMatchesSegment(candidate, segmentStart, params.isMember));

    // No rule means no price, and no price means no booking. A silent default of zero would
    // sell court time for free the day a venue misconfigures its rules.
    if (!rule) {
      throw new ValidationError(`No price rule covers ${segmentStart.toFormat('cccc HH:mm')} at this court`);
    }

    const minutes = Math.round((end - start) / 60_000);
    segments.push({
      ruleId: rule.id,
      start: new Date(start).toISOString(),
      end: new Date(end).toISOString(),
      minutes,
      ratePerHourCents: rule.ratePerHourCents,
      amountCents: Math.round((rule.ratePerHourCents * minutes) / 60),
    });
  }

  return {
    totalCents: segments.reduce((sum, segment) => sum + segment.amountCents, 0),
    snapshot: { segments },
  };
};
