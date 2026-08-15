/**
 * A figure against the same figure over the preceding window of equal length.
 *
 * Pure, because the awkward cases are arithmetic rather than SQL and they all need pinning:
 * growth from zero, a fall to zero, and both being zero are three different sentences and only
 * one of them is a percentage.
 */

export type Trend = {
  current: number;
  previous: number;
  /**
   * Whole percent, signed. Null when there is no meaningful percentage — growth from zero is
   * not "infinite%", it is "up from nothing", and the screen has to say so in words.
   */
  changePercent: number | null;
  direction: 'up' | 'down' | 'flat';
};

export const buildTrend = (current: number, previous: number): Trend => {
  const direction = current > previous ? 'up' : current < previous ? 'down' : 'flat';

  // Dividing by a zero baseline is the case that produces Infinity and renders as "∞%". Both
  // sides zero is flat and 0%, which is honest; a rise from zero has no percentage at all.
  const changePercent =
    previous === 0 ? (current === 0 ? 0 : null) : Math.round(((current - previous) / previous) * 100);

  return { current, previous, changePercent, direction };
};
