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
});
