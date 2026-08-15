import { describe, expect, it } from 'vitest';

import { buildAmenityLabelMap, pickAmenityChips } from './amenities';

const CATALOGUE = [
  { slug: 'aircon', label: 'Air conditioning' },
  { slug: 'parking', label: 'Parking' },
  { slug: 'showers', label: 'Showers' },
  { slug: 'rentals', label: 'Equipment rental' },
];

const labels = buildAmenityLabelMap(CATALOGUE);

describe('pickAmenityChips', () => {
  it('labels every amenity when they all fit', () => {
    const chips = pickAmenityChips(['aircon', 'parking'], labels, 3);

    expect(chips.shown.map(a => a.label)).toEqual(['Air conditioning', 'Parking']);
    expect(chips.overflowCount).toBe(0);
  });

  it('counts the ones that did not fit', () => {
    const chips = pickAmenityChips(['aircon', 'parking', 'showers', 'rentals'], labels, 3);

    expect(chips.shown.map(a => a.label)).toEqual(['Air conditioning', 'Parking', 'Showers']);
    expect(chips.overflowCount).toBe(1);
  });

  /**
   * A slug retired from the catalogue between the venue claiming it and this render. Dropping
   * it is the point — the alternative is a raw database slug in the middle of a result row.
   */
  it('drops a slug the catalogue no longer knows, without counting it as overflow', () => {
    const chips = pickAmenityChips(['aircon', 'helipad'], labels, 3);

    expect(chips.shown.map(a => a.label)).toEqual(['Air conditioning']);
    expect(chips.overflowCount).toBe(0);
  });

  it('has nothing to say about a venue with no amenities', () => {
    expect(pickAmenityChips([], labels, 3)).toEqual({ shown: [], overflowCount: 0 });
  });

  it('preserves the order the API sent, which is the catalogue order', () => {
    const chips = pickAmenityChips(['showers', 'aircon'], labels, 3);

    expect(chips.shown.map(a => a.label)).toEqual(['Showers', 'Air conditioning']);
  });
});
