import { ValidationError } from '@/domain/errors';
import type { PriceRule } from '@/domain/pricing/resolveQuote';

/**
 * Refuses a price rule that overlaps an existing one at the same priority on the same court.
 *
 * Resolution takes the highest-priority matching rule, so two rules that match the same moment
 * at the same priority mean the court has two prices and no rule for choosing between them.
 * `resolveQuote` breaks the tie on id to stay deterministic, but "whichever uuid sorts first"
 * is not a price anyone can explain to a customer. The real answer is to not let the pair exist.
 *
 * Different priorities are fine and are the whole mechanism: the weekday evening peak overlaps
 * the standing rate on purpose, and wins because it is higher.
 */

/** A rule being saved, before it has an id. */
export type CandidateRule = Omit<PriceRule, 'id' | 'courtId'>;

const toMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':');
  return Number(hours) * 60 + Number(minutes ?? 0);
};

/** A null day matches every day, so it overlaps anything. */
const daysOverlap = (a: number | null, b: number | null): boolean => a === null || b === null || a === b;

/**
 * Half-open at the end: a rule running to 17:00 and one starting at 17:00 do not overlap, which
 * is the same boundary convention `resolveQuote` uses when it cuts segments at a window edge.
 */
const timesOverlap = (a: CandidateRule, b: CandidateRule): boolean => {
  if (a.startsAt === null || a.endsAt === null) return true;
  if (b.startsAt === null || b.endsAt === null) return true;

  return toMinutes(a.startsAt) < toMinutes(b.endsAt) && toMinutes(b.startsAt) < toMinutes(a.endsAt);
};

/** Inclusive at both ends, and a null bound is unbounded in that direction. */
const datesOverlap = (a: CandidateRule, b: CandidateRule): boolean => {
  if (a.validFrom !== null && b.validTo !== null && a.validFrom > b.validTo) return false;
  if (b.validFrom !== null && a.validTo !== null && b.validFrom > a.validTo) return false;
  return true;
};

export const doRulesConflict = (a: CandidateRule, b: CandidateRule): boolean => {
  if (a.priority !== b.priority) return false;

  // A member rate and a public rate can cover the same hour without ambiguity — they are read
  // by different callers. Two member rates, or two public ones, cannot.
  if (a.memberOnly !== b.memberOnly) return false;

  return daysOverlap(a.dayOfWeek, b.dayOfWeek) && timesOverlap(a, b) && datesOverlap(a, b);
};

/**
 * `existing` must already exclude the rule being edited, or updating a rule in place would
 * find it conflicting with itself.
 */
export const assertNoRuleConflict = (candidate: CandidateRule, existing: PriceRule[]): void => {
  const clash = existing.find(rule => doRulesConflict(candidate, rule));
  if (!clash) return;

  throw new ValidationError(
    `That overlaps an existing rule at the same priority (${clash.ratePerHourCents / 100} per hour). ` +
      'Give one of them a higher priority, or narrow the days, times or dates so they do not meet.'
  );
};
