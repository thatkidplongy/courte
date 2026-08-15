import type { Sport, VenuePhoto } from '@courte/contract';

import { VenueImage } from '@/components/atoms/VenueImage';

type VenueGalleryProps = {
  /** Already ordered by the API. The first is the primary photo — there is no flag to disagree. */
  photos: VenuePhoto[];
  sport: Sport;
};

const BAND_CLASSES = 'h-32 w-full sm:h-44';

/**
 * The band at the top of a venue page. One photo is a banner; several add a strip beneath it,
 * and none falls back to the sport glyph rather than a grey rectangle that reads as broken.
 *
 * Not a carousel. A venue has a handful of photos, and a control that hides four of five
 * behind an interaction is worse than showing all five at a size the reader can scan.
 */
export const VenueGallery = ({ photos, sport }: VenueGalleryProps) => {
  const [primary, ...rest] = photos;

  return (
    <div>
      <VenueImage photo={primary ?? null} sport={sport} className={BAND_CLASSES} glyphClassName="h-16 w-16" />

      {rest.length > 0 ? (
        <ul className="mt-1 grid grid-cols-3 gap-1 sm:grid-cols-4">
          {rest.map(photo => (
            <li key={photo.url} className="h-20 overflow-hidden sm:h-24">
              <VenueImage photo={photo} sport={sport} className="h-full w-full" />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};
