import type { Amenity } from '@courte/contract';

/**
 * Search rows carry amenity slugs, not labels — a page of twelve courts at four venues would
 * otherwise repeat the same six strings dozens of times. The page fetches the catalogue once
 * and every row resolves against this map.
 */
export const buildAmenityLabelMap = (amenities: Amenity[]): Map<string, string> =>
  new Map(amenities.map(amenity => [amenity.slug, amenity.label]));

export type AmenityChips = {
  /** Slug carried alongside the label so the list keys on identity, never on display text. */
  shown: Amenity[];
  /** How many were left off. Zero when everything fitted. */
  overflowCount: number;
};

/**
 * The first few amenities, plus a count of the rest.
 *
 * A slug with no entry in the catalogue is dropped rather than rendered raw: it means the
 * amenity was retired between the venue claiming it and this page loading, and `parking_2`
 * in the middle of a result row is worse than one fewer chip.
 */
export const pickAmenityChips = (slugs: string[], labels: Map<string, string>, limit: number): AmenityChips => {
  const known = slugs
    .map(slug => {
      const label = labels.get(slug);
      return label === undefined ? null : { slug, label };
    })
    .filter((amenity): amenity is Amenity => amenity !== null);

  return {
    shown: known.slice(0, limit),
    overflowCount: Math.max(0, known.length - limit),
  };
};
