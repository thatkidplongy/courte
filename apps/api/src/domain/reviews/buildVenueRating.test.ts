import { describe, expect, it } from 'vitest';

import { buildVenueRating } from './buildVenueRating';

describe('buildVenueRating', () => {
  it('reports a null average for a venue nobody has reviewed', () => {
    expect(buildVenueRating({ ratingAverage: null, reviewCount: 0 })).toEqual({
      average: null,
      count: 0,
      isTopRated: false,
    });
  });

  it('marks a venue that clears both thresholds', () => {
    expect(buildVenueRating({ ratingAverage: 4.9, reviewCount: 40 }).isTopRated).toBe(true);
  });

  it('includes a venue sitting exactly on both thresholds', () => {
    expect(buildVenueRating({ ratingAverage: 4.8, reviewCount: 10 }).isTopRated).toBe(true);
  });

  /**
   * The case the count threshold exists for: a perfect average from a handful of reviews is not
   * evidence, and without this floor it would outrank every genuinely popular venue.
   */
  it('refuses a perfect average backed by too few reviews', () => {
    expect(buildVenueRating({ ratingAverage: 5, reviewCount: 3 }).isTopRated).toBe(false);
  });

  it('refuses a well-reviewed venue whose average falls short', () => {
    expect(buildVenueRating({ ratingAverage: 4.79, reviewCount: 500 }).isTopRated).toBe(false);
  });
});
