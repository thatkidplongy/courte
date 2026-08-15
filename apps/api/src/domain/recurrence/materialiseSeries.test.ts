import { DateTime } from 'luxon';
import { describe, expect, it, vi } from 'vitest';

import type { MaterialiseDeps, SeriesTemplate } from './materialiseSeries';
import { materialiseSeries } from './materialiseSeries';

/**
 * Ids are integers. Named constants rather than bare numbers so a failing
 * assertion still says which fixture it means.
 */
const S1 = 1;
const U1 = 2;
const V1 = 3;
const C1 = 4;

const MANILA = 'Asia/Manila';
const manila = (iso: string): Date => DateTime.fromISO(iso, { zone: MANILA }).toJSDate();

const series: SeriesTemplate = {
  id: S1,
  createdBy: U1,
  venueId: V1,
  rrule: 'FREQ=WEEKLY;BYDAY=TU',
  timezone: MANILA,
  dtstart: manila('2026-08-11T19:00'),
  durationMinutes: 120,
  source: 'online',
  courtIds: [C1],
  courtBufferMinutes: 0,
};

// Four Tuesdays: Aug 11, 18, 25, Sep 1.
const window = {
  start: DateTime.fromISO('2026-08-10T00:00', { zone: MANILA }).toMillis(),
  end: DateTime.fromISO('2026-09-02T00:00', { zone: MANILA }).toMillis(),
};

const buildDeps = (outcomes: Array<'created' | 'already-exists' | 'conflict'>): MaterialiseDeps => {
  let call = 0;
  return {
    insertOccurrence: vi.fn().mockImplementation(() => Promise.resolve(outcomes[call++] ?? 'created')),
    quoteOccurrence: vi.fn().mockResolvedValue({ totalCents: 90000, snapshot: {} }),
    advanceHorizon: vi.fn().mockResolvedValue(undefined),
  };
};

describe('materialiseSeries', () => {
  it('books every clear occurrence and reports the clashes without aborting', async () => {
    // Week 3 clashes with an existing tournament; weeks 1, 2, 4 must still book.
    const deps = buildDeps(['created', 'created', 'conflict', 'created']);

    const result = await materialiseSeries(deps, { series, window });

    expect(result.created).toEqual([
      manila('2026-08-11T19:00'),
      manila('2026-08-18T19:00'),
      manila('2026-09-01T19:00'),
    ]);
    expect(result.conflicts).toEqual([manila('2026-08-25T19:00')]);
  });

  it('treats already-materialised occurrences as no-ops, making re-runs safe', async () => {
    const deps = buildDeps(['already-exists', 'already-exists', 'created', 'created']);

    const result = await materialiseSeries(deps, { series, window });

    expect(result.skipped).toBe(2);
    expect(result.created).toHaveLength(2);
    expect(result.conflicts).toHaveLength(0);
  });

  it('advances the horizon even when occurrences conflicted', async () => {
    const deps = buildDeps(['conflict', 'conflict', 'conflict', 'conflict']);

    await materialiseSeries(deps, { series, window });

    expect(deps.advanceHorizon).toHaveBeenCalledWith(S1, new Date(window.end));
  });

  it('quotes each occurrence individually so peak pricing lands per week', async () => {
    const deps = buildDeps(['created', 'created', 'created', 'created']);

    await materialiseSeries(deps, { series, window });

    expect(deps.quoteOccurrence).toHaveBeenCalledTimes(4);
    expect(deps.quoteOccurrence).toHaveBeenCalledWith(series, manila('2026-08-11T19:00'), manila('2026-08-11T21:00'));
  });
});
