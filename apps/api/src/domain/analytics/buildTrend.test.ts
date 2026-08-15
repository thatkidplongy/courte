import { describe, expect, it } from 'vitest';

import { buildTrend } from './buildTrend';

describe('buildTrend', () => {
  it('reports a rise as a whole percent', () => {
    expect(buildTrend(120, 100)).toEqual({ current: 120, previous: 100, changePercent: 20, direction: 'up' });
  });

  it('reports a fall as a negative percent', () => {
    expect(buildTrend(75, 100)).toMatchObject({ changePercent: -25, direction: 'down' });
  });

  it('rounds to a whole percent rather than showing decimals nobody acts on', () => {
    expect(buildTrend(107, 93).changePercent).toBe(15);
  });

  /**
   * The case that renders as "∞%" if the division is left unguarded. Growth from nothing has no
   * percentage — the screen has to say "up from nothing" in words instead.
   */
  it('has no percentage for growth from a zero baseline', () => {
    expect(buildTrend(40, 0)).toMatchObject({ changePercent: null, direction: 'up' });
  });

  it('calls two zeroes flat at 0%, not unknown', () => {
    expect(buildTrend(0, 0)).toMatchObject({ changePercent: 0, direction: 'flat' });
  });

  it('reports a collapse to zero as -100%', () => {
    expect(buildTrend(0, 50)).toMatchObject({ changePercent: -100, direction: 'down' });
  });

  it('calls equal figures flat', () => {
    expect(buildTrend(30, 30)).toMatchObject({ changePercent: 0, direction: 'flat' });
  });
});
