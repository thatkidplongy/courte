import type { Amenity } from '@courte/contract';

import { query } from '@/db/client';

/**
 * The amenity catalogue. Small, slow-moving and read on every search page, which is why the
 * filter rail fetches it once and resolves slugs itself rather than every court row carrying
 * a copy of the same six labels.
 *
 * Retired amenities stay in the table so a venue's historical rows still resolve to a label;
 * they simply stop being offered.
 */
export const listAmenities = (): Promise<Amenity[]> =>
  query<Amenity>(
    `
    SELECT slug, label
    FROM amenities
    WHERE deleted_at IS NULL
    ORDER BY sort_order, slug
    `
  );

/** One venue's amenities, already labelled — the court page shows them rather than filters on them. */
export const findAmenitiesForVenue = (venueId: string): Promise<Amenity[]> =>
  query<Amenity>(
    `
    SELECT a.slug, a.label
    FROM venue_amenities va
    JOIN amenities a ON a.slug = va.amenity_slug AND a.deleted_at IS NULL
    WHERE va.venue_id = $1 AND va.deleted_at IS NULL
    ORDER BY a.sort_order, a.slug
    `,
    [venueId]
  );
