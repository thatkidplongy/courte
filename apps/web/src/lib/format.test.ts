import { describe, expect, it } from 'vitest';

import {
  formatClockLabel,
  formatDay,
  formatDistance,
  formatHourLabel,
  formatPesos,
  formatTime,
  formatWholePesos,
} from './format';

describe('formatPesos', () => {
  it('renders cents as pesos with two decimals', () => {
    expect(formatPesos(140000)).toBe('₱1,400.00');
  });

  it('keeps a zero amount explicit rather than blank', () => {
    expect(formatPesos(0)).toBe('₱0.00');
  });
});

describe('formatWholePesos', () => {
  it('drops the decimals for headline rates', () => {
    expect(formatWholePesos(30000)).toBe('₱300');
  });

  it('rounds rather than truncating, so ₱299.50 never reads as ₱299', () => {
    expect(formatWholePesos(29950)).toBe('₱300');
  });
});

describe('formatDistance', () => {
  it('uses metres below a kilometre', () => {
    expect(formatDistance(940)).toBe('940 m');
  });

  it('switches to kilometres at exactly 1000 m', () => {
    expect(formatDistance(1000)).toBe('1.0 km');
  });

  it('keeps one decimal place so 1402 m is not "1 km"', () => {
    expect(formatDistance(1402)).toBe('1.4 km');
  });
});

describe('formatTime', () => {
  /**
   * The venue's zone decides the clock face, not the server's. This instant is 20:00 in
   * Manila and 12:00 UTC — if the zone were ignored the assertion would read 12:00 PM.
   */
  it('renders the instant in the venue zone', () => {
    expect(formatTime(new Date('2026-08-13T12:00:00.000Z'), 'Asia/Manila')).toBe('8:00 PM');
  });

  it('can roll the clock into the previous day for a western zone', () => {
    expect(formatTime(new Date('2026-08-13T12:00:00.000Z'), 'America/New_York')).toBe('8:00 AM');
  });
});

describe('formatDay', () => {
  it('renders the date in the venue zone', () => {
    expect(formatDay(new Date('2026-08-13T12:00:00.000Z'), 'Asia/Manila')).toBe('Thu, 13 Aug 2026');
  });

  /** 16:00 UTC is already the 14th in Manila — the zone has to win here too. */
  it('uses the venue-local day, not the UTC day', () => {
    expect(formatDay(new Date('2026-08-13T16:00:00.000Z'), 'Asia/Manila')).toBe('Fri, 14 Aug 2026');
  });
});

describe('formatHourLabel', () => {
  it('reads midnight as 12 AM rather than 0 AM', () => {
    expect(formatHourLabel(0)).toBe('12 AM');
  });

  it('reads noon as 12 PM rather than 0 PM', () => {
    expect(formatHourLabel(12)).toBe('12 PM');
  });

  it('turns an evening hour into its twelve-hour form', () => {
    expect(formatHourLabel(21)).toBe('9 PM');
  });

  it('keeps a morning hour in the morning', () => {
    expect(formatHourLabel(6)).toBe('6 AM');
  });
});

describe('formatClockLabel', () => {
  it('turns a 24-hour time into the twelve-hour form the search bar shows', () => {
    expect(formatClockLabel('18:00')).toBe('6:00 PM');
  });

  it('keeps the half hour', () => {
    expect(formatClockLabel('06:30')).toBe('6:30 AM');
  });

  it('reads midnight as 12:00 AM rather than 0:00 AM', () => {
    expect(formatClockLabel('00:00')).toBe('12:00 AM');
  });

  it('hands back anything it cannot parse, so a bad value never renders as "Invalid DateTime"', () => {
    expect(formatClockLabel('tea time')).toBe('tea time');
  });
});
