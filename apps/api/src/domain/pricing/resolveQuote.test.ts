import { DateTime } from 'luxon';
import { describe, expect, it } from 'vitest';

import { ValidationError } from '@/domain/errors';

import type { PriceRule } from './resolveQuote';
import { resolveQuote } from './resolveQuote';

const MANILA = 'Asia/Manila';
const at = (iso: string): number => DateTime.fromISO(iso, { zone: MANILA }).toMillis();

// 2026-08-10 is a Monday (dayOfWeek 0), 2026-08-15 a Saturday (dayOfWeek 5).
const MONDAY = '2026-08-10';
const SATURDAY = '2026-08-15';

const baseRule: PriceRule = {
  id: 'base',
  courtId: 'c1',
  priority: 0,
  dayOfWeek: null,
  startsAt: null,
  endsAt: null,
  validFrom: null,
  validTo: null,
  memberOnly: false,
  ratePerHourCents: 50000,
};

const weekdayPeak: PriceRule = {
  id: 'peak',
  courtId: 'c1',
  priority: 10,
  dayOfWeek: 0,
  startsAt: '17:00',
  endsAt: '22:00',
  validFrom: null,
  validTo: null,
  memberOnly: false,
  ratePerHourCents: 70000,
};

const memberRate: PriceRule = {
  id: 'member',
  courtId: 'c1',
  priority: 20,
  dayOfWeek: null,
  startsAt: null,
  endsAt: null,
  validFrom: null,
  validTo: null,
  memberOnly: true,
  ratePerHourCents: 40000,
};

describe('resolveQuote', () => {
  it('prices a booking entirely inside one band at that band', () => {
    const quote = resolveQuote({
      rules: [baseRule, weekdayPeak],
      requested: { start: at(`${MONDAY}T10:00`), end: at(`${MONDAY}T12:00`) },
      timezone: MANILA,
      isMember: false,
    });

    expect(quote.totalCents).toBe(100000);
    expect(quote.snapshot.segments).toHaveLength(1);
    expect(quote.snapshot.segments[0]?.ruleId).toBe('base');
  });

  it('splits a booking crossing a peak boundary and prices each stretch at its own rate', () => {
    // 16:00-19:00 Monday: one hour base (500) + two hours peak (1400) = 1900.
    const quote = resolveQuote({
      rules: [baseRule, weekdayPeak],
      requested: { start: at(`${MONDAY}T16:00`), end: at(`${MONDAY}T19:00`) },
      timezone: MANILA,
      isMember: false,
    });

    expect(quote.totalCents).toBe(50000 + 2 * 70000);
    expect(quote.snapshot.segments.map(s => s.ruleId)).toEqual(['base', 'peak']);
    expect(quote.snapshot.segments[1]?.minutes).toBe(120);
  });

  it('ignores a weekday peak on the weekend', () => {
    const quote = resolveQuote({
      rules: [baseRule, weekdayPeak],
      requested: { start: at(`${SATURDAY}T17:00`), end: at(`${SATURDAY}T19:00`) },
      timezone: MANILA,
      isMember: false,
    });

    expect(quote.totalCents).toBe(100000);
    expect(quote.snapshot.segments[0]?.ruleId).toBe('base');
  });

  it('applies member pricing only to members', () => {
    const request = {
      rules: [baseRule, memberRate],
      requested: { start: at(`${MONDAY}T10:00`), end: at(`${MONDAY}T11:00`) },
      timezone: MANILA,
    };

    expect(resolveQuote({ ...request, isMember: true }).totalCents).toBe(40000);
    expect(resolveQuote({ ...request, isMember: false }).totalCents).toBe(50000);
  });

  it('prices partial hours pro-rata', () => {
    const quote = resolveQuote({
      rules: [baseRule],
      requested: { start: at(`${MONDAY}T10:00`), end: at(`${MONDAY}T11:30`) },
      timezone: MANILA,
      isMember: false,
    });

    expect(quote.totalCents).toBe(75000);
  });

  it('handles a booking crossing midnight on the 24/7 court', () => {
    // 23:00 Monday to 01:00 Tuesday under a single always-on rule: cut at midnight,
    // both segments priced, total unchanged.
    const quote = resolveQuote({
      rules: [baseRule],
      requested: { start: at(`${MONDAY}T23:00`), end: at('2026-08-11T01:00') },
      timezone: MANILA,
      isMember: false,
    });

    expect(quote.totalCents).toBe(100000);
    expect(quote.snapshot.segments).toHaveLength(2);
  });

  it('refuses to quote a segment no rule covers', () => {
    const eveningOnly: PriceRule = { ...baseRule, id: 'evening', startsAt: '18:00', endsAt: '22:00' };

    expect(() =>
      resolveQuote({
        rules: [eveningOnly],
        requested: { start: at(`${MONDAY}T17:00`), end: at(`${MONDAY}T19:00`) },
        timezone: MANILA,
        isMember: false,
      })
    ).toThrow(ValidationError);
  });

  it('refuses an inverted or oversized range', () => {
    const rules = [baseRule];

    expect(() =>
      resolveQuote({
        rules,
        requested: { start: at(`${MONDAY}T12:00`), end: at(`${MONDAY}T10:00`) },
        timezone: MANILA,
        isMember: false,
      })
    ).toThrow(ValidationError);

    expect(() =>
      resolveQuote({
        rules,
        requested: { start: at(`${MONDAY}T00:00`), end: at('2026-08-12T00:00') },
        timezone: MANILA,
        isMember: false,
      })
    ).toThrow(ValidationError);
  });

  describe('date-scoped rules', () => {
    const holiday: PriceRule = {
      ...baseRule,
      id: 'holiday',
      priority: 20,
      validFrom: SATURDAY,
      validTo: SATURDAY,
      ratePerHourCents: 90000,
    };

    const quoteOn = (day: string, rules: PriceRule[]) =>
      resolveQuote({
        rules,
        requested: { start: at(`${day}T10:00`), end: at(`${day}T11:00`) },
        timezone: MANILA,
        isMember: false,
      });

    it('charges the holiday rate on the day it covers', () => {
      expect(quoteOn(SATURDAY, [baseRule, holiday]).totalCents).toBe(90000);
    });

    it('falls back to the standing rate on every other day', () => {
      expect(quoteOn(MONDAY, [baseRule, holiday]).totalCents).toBe(50000);
    });

    it('treats validFrom alone as a price rise from that date onwards', () => {
      const rise = { ...holiday, id: 'rise', validFrom: SATURDAY, validTo: null };

      expect(quoteOn(MONDAY, [baseRule, rise]).totalCents).toBe(50000);
      expect(quoteOn(SATURDAY, [baseRule, rise]).totalCents).toBe(90000);
      expect(quoteOn('2026-08-20', [baseRule, rise]).totalCents).toBe(90000);
    });

    it('treats validTo alone as a promotion that expires', () => {
      const promo = { ...holiday, id: 'promo', validFrom: null, validTo: MONDAY };

      expect(quoteOn(MONDAY, [baseRule, promo]).totalCents).toBe(90000);
      expect(quoteOn(SATURDAY, [baseRule, promo]).totalCents).toBe(50000);
    });

    /**
     * The reason the comparison is venue-local. 08:00 in Manila on the 15th is 00:00 UTC on
     * the 15th, but 23:00 UTC on the 14th at 07:00 — a UTC comparison would drop the holiday
     * rate for the first hours of the venue's own day.
     */
    it('bounds the day in venue-local time, not UTC', () => {
      const early = resolveQuote({
        rules: [baseRule, holiday],
        requested: { start: at(`${SATURDAY}T06:00`), end: at(`${SATURDAY}T07:00`) },
        timezone: MANILA,
        isMember: false,
      });

      expect(early.totalCents).toBe(90000);
    });

    /**
     * The claim that no new cut points are needed: a booking running across local midnight into
     * the holiday is already segmented there for the day-of-week rules, so each half prices
     * against its own date.
     */
    it('splits a booking that crosses midnight into the holiday', () => {
      const quote = resolveQuote({
        rules: [baseRule, holiday],
        requested: { start: at('2026-08-14T23:00'), end: at(`${SATURDAY}T01:00`) },
        timezone: MANILA,
        isMember: false,
      });

      expect(quote.snapshot.segments).toHaveLength(2);
      expect(quote.totalCents).toBe(50000 + 90000);
    });
  });

  /**
   * Two rules the write-time guard would refuse, priced twice. The point is not which one wins
   * but that the same one wins every time, whatever order they arrive in.
   */
  it('resolves equal-priority rules identically regardless of input order', () => {
    const left: PriceRule = { ...baseRule, id: 'aaa', ratePerHourCents: 11100 };
    const right: PriceRule = { ...baseRule, id: 'bbb', ratePerHourCents: 22200 };
    const requested = { start: at(`${MONDAY}T10:00`), end: at(`${MONDAY}T11:00`) };

    const forwards = resolveQuote({ rules: [left, right], requested, timezone: MANILA, isMember: false });
    const backwards = resolveQuote({ rules: [right, left], requested, timezone: MANILA, isMember: false });

    expect(forwards.totalCents).toBe(backwards.totalCents);
  });
});
