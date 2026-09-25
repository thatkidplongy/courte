import { beforeEach, describe, expect, it, vi } from 'vitest';

import { query as rawQuery } from '@/db/client';

import { searchCourtsByProximity } from './courtRepository';

// Hoisted above the imports by vitest, so `rawQuery` is already the mock by the time it binds.
// A static import rather than a top-level `await import`: this package compiles to CommonJS,
// where tsc rejects top-level await even though the test runner would have accepted it.
vi.mock('@/db/client', () => ({ query: vi.fn() }));

const query = vi.mocked(rawQuery);

/**
 * Characterisation tests, not correctness tests: they pin down what this query builder does
 * today so a refactoring of it can be shown to change nothing.
 *
 * The invariant worth guarding is the one the code cannot state — every `$n` in the SQL text is
 * an index into the values array, produced by reading `values.length` at the moment each value
 * is pushed. Reorder the pushes and the SQL still runs, still returns rows, and silently filters
 * on the wrong column. No type and no linter catches that, so it is pinned here.
 */

const BASE = { longitude: 123.89, latitude: 10.31, radiusMetres: 5000, sort: 'distance' as const };

const lastCall = () => {
  const call = query.mock.calls.at(-1);
  if (!call) throw new Error('query was never called');
  return { sql: call[0] as string, values: call[1] as unknown[] };
};

/** Every placeholder the SQL text actually references. */
const placeholdersIn = (sql: string): number[] =>
  [...sql.matchAll(/\$(\d+)/g)].map(match => Number(match[1])).sort((a, b) => a - b);

beforeEach(() => {
  query.mockReset();
  query.mockResolvedValue([]);
});

describe('searchCourtsByProximity parameter binding', () => {
  it('binds the origin and radius first, in the order the SQL reads them', async () => {
    await searchCourtsByProximity(BASE);

    const { values } = lastCall();
    expect(values[0]).toBe(BASE.longitude);
    expect(values[1]).toBe(BASE.latitude);
    expect(values[2]).toBe(BASE.radiusMetres);
  });

  it('appends limit then offset last, with offset derived from the page', async () => {
    await searchCourtsByProximity({ ...BASE, page: 3, limit: 12 });

    const { values } = lastCall();
    expect(values.at(-2)).toBe(12);
    expect(values.at(-1)).toBe(24);
  });

  it('never references a placeholder beyond the values it bound', async () => {
    await searchCourtsByProximity({
      ...BASE,
      sport: 'padel' as never,
      surface: 'indoor',
      amenitySlugs: ['parking', 'showers'],
      minRatePerHourCents: 10000,
      maxRatePerHourCents: 60000,
      page: 2,
      limit: 5,
    });

    const { sql, values } = lastCall();
    expect(Math.max(...placeholdersIn(sql))).toBeLessThanOrEqual(values.length);
  });

  it('puts each filter value at the index its own placeholder names', async () => {
    await searchCourtsByProximity({
      ...BASE,
      sport: 'badminton',
      surface: 'covered',
      maxRatePerHourCents: 45000,
      minRatePerHourCents: 20000,
    });

    const { sql, values } = lastCall();
    const indexOf = (fragment: RegExp) => Number(sql.match(fragment)?.[1]);

    expect(values[indexOf(/c\.sport = \$(\d+)/) - 1]).toBe('badminton');
    expect(values[indexOf(/c\.surface = \$(\d+)/) - 1]).toBe('covered');
    expect(values[indexOf(/from_rate_cents <= \$(\d+)/) - 1]).toBe(45000);
    expect(values[indexOf(/from_rate_cents >= \$(\d+)/) - 1]).toBe(20000);
  });

  it('binds the amenity list once and reads that one placeholder twice, which is the AND semantics', async () => {
    await searchCourtsByProximity({ ...BASE, amenitySlugs: ['parking', 'showers'] });

    const { sql, values } = lastCall();
    const anyIndex = Number(sql.match(/amenity_slug = ANY\(\$(\d+)::text\[\]\)/)?.[1]);
    const cardinalityIndex = Number(sql.match(/cardinality\(\$(\d+)::text\[\]\)/)?.[1]);

    expect(anyIndex).toBe(cardinalityIndex);
    expect(values[anyIndex - 1]).toEqual(['parking', 'showers']);
    expect(values.filter(value => Array.isArray(value))).toHaveLength(1);
  });

  it('omits a filter entirely rather than binding a null for it', async () => {
    await searchCourtsByProximity(BASE);

    const { sql, values } = lastCall();
    // The filter fragments, not the columns: `from_rate_cents` is selected on every row and
    // "VenueAmenity" is joined on every row, so only the comparisons tell you a filter applied.
    expect(sql).not.toContain('c.sport =');
    expect(sql).not.toContain('c.surface =');
    expect(sql).not.toContain('rate.from_rate_cents <=');
    expect(sql).not.toContain('rate.from_rate_cents >=');
    // Origin, radius, limit, offset and nothing else.
    expect(values).toHaveLength(5);
  });

  it('treats an empty amenity list as no filter at all', async () => {
    await searchCourtsByProximity({ ...BASE, amenitySlugs: [] });

    const { sql, values } = lastCall();
    expect(sql).not.toContain('cardinality(');
    expect(values).toHaveLength(5);
  });
});

describe('searchCourtsByProximity sorting', () => {
  it('takes ORDER BY from the closed enum rather than from caller text', async () => {
    await searchCourtsByProximity({ ...BASE, sort: 'price' });
    expect(lastCall().sql).toContain('from_rate_cents ASC NULLS LAST');

    await searchCourtsByProximity({ ...BASE, sort: 'rating' });
    expect(lastCall().sql).toContain('rating_avg DESC NULLS LAST');
  });

  it('sorts an unrated venue after every rated one rather than below the worst', async () => {
    await searchCourtsByProximity({ ...BASE, sort: 'rating' });
    expect(lastCall().sql).toMatch(/rating_avg DESC NULLS LAST/);
  });
});

describe('searchCourtsByProximity row mapping', () => {
  const row = {
    id: 7,
    venue_id: 2,
    name: 'Court 1',
    sport: 'badminton',
    surface: 'indoor',
    min_duration_minutes: 60,
    max_duration_minutes: 180,
    increment_minutes: 30,
    buffer_minutes: 15,
    venue_name: 'Metro Sports Centre',
    venue_address: 'Cebu City',
    venue_timezone: 'Asia/Manila',
    venue_amenity_slugs: ['parking'],
    photo_url: null,
    photo_alt: null,
    latitude: '10.31',
    longitude: '123.89',
    venue_court_count: '3',
    review_count: 4,
    rating_avg: '4.5',
    distance_metres: 812.6,
    from_rate_cents: '45000',
    total_count: '17',
  };

  it('converts the numeric strings Postgres returns and rounds the distance', async () => {
    query.mockResolvedValue([row]);
    const { courts, total } = await searchCourtsByProximity(BASE);

    expect(courts[0]).toMatchObject({
      id: 7,
      venueCourtCount: 3,
      venueRatingAverage: 4.5,
      latitude: 10.31,
      distanceMetres: 813,
      fromRatePerHourCents: 45000,
    });
    expect(total).toBe(17);
  });

  it('reads a venue with no photo as null rather than a half-built object', async () => {
    query.mockResolvedValue([row]);
    const { courts } = await searchCourtsByProximity(BASE);
    expect(courts[0]?.venuePhoto).toBeNull();
  });

  it('reports a total of zero when nothing matched, rather than reading row zero', async () => {
    query.mockResolvedValue([]);
    const { courts, total } = await searchCourtsByProximity(BASE);

    expect(courts).toEqual([]);
    expect(total).toBe(0);
  });
});
