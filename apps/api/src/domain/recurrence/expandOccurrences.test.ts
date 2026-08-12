import { DateTime } from 'luxon';
import { describe, expect, it } from 'vitest';

import { expandOccurrences, splitRrule } from './expandOccurrences';

const MANILA = 'Asia/Manila';
const SYDNEY = 'Australia/Sydney';

const manila = (iso: string): Date => DateTime.fromISO(iso, { zone: MANILA }).toJSDate();
const sydney = (iso: string): Date => DateTime.fromISO(iso, { zone: SYDNEY }).toJSDate();

const windowOf = (fromIso: string, toIso: string, zone: string) => ({
  start: DateTime.fromISO(fromIso, { zone }).toMillis(),
  end: DateTime.fromISO(toIso, { zone }).toMillis(),
});

describe('expandOccurrences', () => {
  it('expands a weekly Tuesday rule into consecutive local 19:00 starts', () => {
    const occurrences = expandOccurrences({
      rrule: 'FREQ=WEEKLY;BYDAY=TU',
      timezone: MANILA,
      dtstart: manila('2026-08-11T19:00'),
      durationMinutes: 120,
      window: windowOf('2026-08-11T00:00', '2026-08-26T00:00', MANILA),
    });

    expect(occurrences).toHaveLength(3);
    expect(occurrences[0]?.start).toEqual(manila('2026-08-11T19:00'));
    expect(occurrences[1]?.start).toEqual(manila('2026-08-18T19:00'));
    expect(occurrences[2]?.start).toEqual(manila('2026-08-25T19:00'));
    expect(occurrences[0]?.end).toEqual(manila('2026-08-11T21:00'));
  });

  it('keeps the local wall-clock time across a DST transition', () => {
    // Sydney springs forward on 2026-10-04: AEST (+10) before, AEDT (+11) after.
    // "Every Tuesday 19:00" must stay 19:00 local — the UTC instant shifts by an hour.
    const occurrences = expandOccurrences({
      rrule: 'FREQ=WEEKLY;BYDAY=TU',
      timezone: SYDNEY,
      dtstart: sydney('2026-09-29T19:00'),
      durationMinutes: 60,
      window: windowOf('2026-09-29T00:00', '2026-10-07T00:00', SYDNEY),
    });

    expect(occurrences).toHaveLength(2);

    const before = DateTime.fromJSDate(occurrences[0]!.start).setZone(SYDNEY);
    const after = DateTime.fromJSDate(occurrences[1]!.start).setZone(SYDNEY);

    expect(before.toFormat('HH:mm ZZ')).toBe('19:00 +10:00');
    expect(after.toFormat('HH:mm ZZ')).toBe('19:00 +11:00');
  });

  it('respects COUNT-limited rules', () => {
    const occurrences = expandOccurrences({
      rrule: 'FREQ=WEEKLY;BYDAY=TU;COUNT=2',
      timezone: MANILA,
      dtstart: manila('2026-08-11T19:00'),
      durationMinutes: 60,
      window: windowOf('2026-08-01T00:00', '2026-12-31T00:00', MANILA),
    });

    expect(occurrences).toHaveLength(2);
  });

  it('returns only occurrences inside the window', () => {
    const occurrences = expandOccurrences({
      rrule: 'FREQ=WEEKLY;BYDAY=TU',
      timezone: MANILA,
      dtstart: manila('2026-08-11T19:00'),
      durationMinutes: 60,
      window: windowOf('2026-08-17T00:00', '2026-08-20T00:00', MANILA),
    });

    expect(occurrences).toHaveLength(1);
    expect(occurrences[0]?.start).toEqual(manila('2026-08-18T19:00'));
  });
});

describe('splitRrule', () => {
  it('caps the old rule strictly before the split occurrence', () => {
    const split = splitRrule({
      rrule: 'FREQ=WEEKLY;BYDAY=TU',
      timezone: MANILA,
      splitAt: manila('2026-09-01T19:00'),
    });

    const remaining = expandOccurrences({
      rrule: split.cappedRrule,
      timezone: MANILA,
      dtstart: manila('2026-08-11T19:00'),
      durationMinutes: 60,
      window: windowOf('2026-08-01T00:00', '2026-12-31T00:00', MANILA),
    });

    // 11, 18, 25 August survive; 1 September and beyond belong to the successor series.
    expect(remaining).toHaveLength(3);
    expect(remaining.at(-1)?.start).toEqual(manila('2026-08-25T19:00'));
  });

  it('hands the successor series the split occurrence as its dtstart', () => {
    const splitAt = manila('2026-09-01T19:00');

    expect(splitRrule({ rrule: 'FREQ=WEEKLY;BYDAY=TU', timezone: MANILA, splitAt }).newDtstart).toEqual(splitAt);
  });

  it('produces a parseable capped rule', () => {
    const { cappedRrule } = splitRrule({
      rrule: 'FREQ=WEEKLY;BYDAY=TU;INTERVAL=2',
      timezone: MANILA,
      splitAt: manila('2026-09-01T19:00'),
    });

    expect(cappedRrule).toContain('FREQ=WEEKLY');
    expect(cappedRrule).toContain('INTERVAL=2');
    expect(cappedRrule).toContain('UNTIL=');
  });
});
