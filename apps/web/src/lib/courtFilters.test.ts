import { describe, expect, it } from 'vitest';

import { buildCourtsHref, clearCourtFilters, countActiveFilters, parseCourtFilters } from './courtFilters';

const TODAY = '2026-08-16';

describe('parseCourtFilters', () => {
  it('keeps a time the pickers offer', () => {
    expect(parseCourtFilters({ time: '18:00' }, TODAY).time).toBe('18:00');
  });

  /**
   * The time filter costs the API a sweep over every candidate court, so a value no control can
   * produce is dropped rather than paid for — and a hand-typed URL browses unfiltered instead
   * of erroring.
   */
  it('drops a time no control could have produced', () => {
    expect(parseCourtFilters({ time: '03:07' }, TODAY).time).toBeUndefined();
    expect(parseCourtFilters({ time: '23:30' }, TODAY).time).toBeUndefined();
    expect(parseCourtFilters({ time: 'evening' }, TODAY).time).toBeUndefined();
  });

  it('treats an absent time as any time of day', () => {
    expect(parseCourtFilters({}, TODAY).time).toBeUndefined();
  });
});

describe('buildCourtsHref', () => {
  it('carries the time across a page change, so paging cannot widen the result set', () => {
    const filters = parseCourtFilters({ time: '19:30', sport: 'tennis' }, TODAY);

    expect(buildCourtsHref(filters, { page: 2 })).toContain('time=19%3A30');
  });

  it('leaves the parameter out entirely when no time is set', () => {
    expect(buildCourtsHref(parseCourtFilters({}, TODAY))).not.toContain('time=');
  });
});

describe('countActiveFilters', () => {
  it('counts the time as a filter the reader can clear', () => {
    expect(countActiveFilters(parseCourtFilters({ time: '18:00' }, TODAY))).toBe(1);
  });
});

describe('clearCourtFilters', () => {
  it('drops the time but keeps the day', () => {
    const cleared = clearCourtFilters(parseCourtFilters({ time: '18:00', date: '2026-09-01' }, TODAY));

    expect(cleared.time).toBeUndefined();
    expect(cleared.dateIso).toBe('2026-09-01');
  });
});
