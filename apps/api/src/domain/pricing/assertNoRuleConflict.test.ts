import { describe, expect, it } from 'vitest';

import { ValidationError } from '@/domain/errors';

import { assertNoRuleConflict, doRulesConflict, type CandidateRule } from './assertNoRuleConflict';
import type { PriceRule } from './resolveQuote';

/**
 * Ids are integers. Named constants rather than bare numbers so a failing
 * assertion still says which fixture it means.
 */
const EXISTING = 1;
const COURT_1 = 2;

const standing: CandidateRule = {
  priority: 0,
  dayOfWeek: null,
  startsAt: null,
  endsAt: null,
  validFrom: null,
  validTo: null,
  memberOnly: false,
  ratePerHourCents: 30000,
};

const rule = (overrides: Partial<CandidateRule> = {}): CandidateRule => ({ ...standing, ...overrides });

const saved = (overrides: Partial<PriceRule> = {}): PriceRule => ({
  id: EXISTING,
  courtId: COURT_1,
  ...standing,
  ...overrides,
});

describe('doRulesConflict', () => {
  it('flags two standing rules, which cover every moment', () => {
    expect(doRulesConflict(rule(), rule())).toBe(true);
  });

  /**
   * The mechanism the whole model rests on: the weekday evening peak is *supposed* to overlap
   * the standing rate. Different priorities say which wins, so they are not in conflict.
   */
  it('allows an overlap at a different priority', () => {
    expect(doRulesConflict(rule(), rule({ priority: 10, startsAt: '17:00', endsAt: '22:00' }))).toBe(false);
  });

  it('allows a member rate to sit on top of a public one', () => {
    expect(doRulesConflict(rule(), rule({ memberOnly: true }))).toBe(false);
  });

  describe('times', () => {
    const morning = rule({ startsAt: '06:00', endsAt: '12:00' });

    it('flags windows that intersect', () => {
      expect(doRulesConflict(morning, rule({ startsAt: '10:00', endsAt: '14:00' }))).toBe(true);
    });

    /** Half-open at the end, the same boundary resolveQuote cuts segments on. */
    it('allows windows that meet exactly at an edge', () => {
      expect(doRulesConflict(morning, rule({ startsAt: '12:00', endsAt: '18:00' }))).toBe(false);
    });

    it('flags an all-day rule against any window', () => {
      expect(doRulesConflict(rule(), morning)).toBe(true);
    });
  });

  describe('days', () => {
    it('allows two rules on different weekdays', () => {
      expect(doRulesConflict(rule({ dayOfWeek: 0 }), rule({ dayOfWeek: 1 }))).toBe(false);
    });

    it('flags the same weekday', () => {
      expect(doRulesConflict(rule({ dayOfWeek: 0 }), rule({ dayOfWeek: 0 }))).toBe(true);
    });

    it('flags an every-day rule against a single weekday', () => {
      expect(doRulesConflict(rule(), rule({ dayOfWeek: 3 }))).toBe(true);
    });
  });

  describe('dates', () => {
    it('allows two holidays on different dates', () => {
      const christmas = rule({ validFrom: '2026-12-25', validTo: '2026-12-25' });
      const newYear = rule({ validFrom: '2027-01-01', validTo: '2027-01-01' });

      expect(doRulesConflict(christmas, newYear)).toBe(false);
    });

    it('flags date ranges that intersect', () => {
      const december = rule({ validFrom: '2026-12-01', validTo: '2026-12-31' });
      const christmas = rule({ validFrom: '2026-12-25', validTo: '2026-12-25' });

      expect(doRulesConflict(december, christmas)).toBe(true);
    });

    /** Inclusive at both ends: a range ending on the day another starts does meet. */
    it('flags ranges that touch on a single day', () => {
      const first = rule({ validFrom: '2026-12-01', validTo: '2026-12-25' });
      const second = rule({ validFrom: '2026-12-25', validTo: '2026-12-31' });

      expect(doRulesConflict(first, second)).toBe(true);
    });

    it('allows a bounded rule that ends before an open-ended one begins', () => {
      const promo = rule({ validTo: '2026-11-30' });
      const rise = rule({ validFrom: '2026-12-01' });

      expect(doRulesConflict(promo, rise)).toBe(false);
    });

    it('flags an unbounded rule against any dated one', () => {
      expect(doRulesConflict(rule(), rule({ validFrom: '2026-12-25', validTo: '2026-12-25' }))).toBe(true);
    });
  });
});

describe('assertNoRuleConflict', () => {
  it('passes when nothing overlaps', () => {
    expect(() => assertNoRuleConflict(rule({ priority: 10 }), [saved()])).not.toThrow();
  });

  it('refuses a clash, naming the rate already in the way', () => {
    expect(() => assertNoRuleConflict(rule(), [saved({ ratePerHourCents: 45000 })])).toThrow(ValidationError);
    expect(() => assertNoRuleConflict(rule(), [saved({ ratePerHourCents: 45000 })])).toThrow(/450 per hour/);
  });

  /** Editing a rule in place: the caller excludes it, or it would clash with itself. */
  it('has nothing to clash with when the existing set is empty', () => {
    expect(() => assertNoRuleConflict(rule(), [])).not.toThrow();
  });
});
