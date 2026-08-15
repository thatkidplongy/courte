import Link from 'next/link';

import type { CourtSearchItem } from '@courte/contract';

import { LinkButton } from '@/components/atoms/LinkButton';
import { VenueImage } from '@/components/atoms/VenueImage';
import { SlotChipList } from '@/components/molecules/SlotChipList';
import { AMENITY_CHIPS_PER_ROW, COURT_SURFACE_LABELS, SPORT_LABELS } from '@/consts';
import { pickAmenityChips } from '@/lib/amenities';
import { formatDistance, formatWholePesos } from '@/lib/format';
import { cn } from '@/lib/utils';

type CourtResultRowProps = {
  court: CourtSearchItem;
  dateIso: string;
  /** slug -> label, from the catalogue the page fetched once. */
  amenityLabels: Map<string, string>;
  /** Marks the row the map pin is pointing at. */
  isHighlighted?: boolean;
};

const pluraliseCourts = (count: number): string => `${count} ${count === 1 ? 'court' : 'courts'}`;

const AmenityChips = ({ slugs, labels }: { slugs: string[]; labels: Map<string, string> }) => {
  const { shown, overflowCount } = pickAmenityChips(slugs, labels, AMENITY_CHIPS_PER_ROW);
  if (shown.length === 0) return null;

  return (
    <ul className="mt-2.5 flex flex-wrap gap-1.5">
      {shown.map(amenity => (
        <li
          key={amenity.slug}
          className="border-border text-muted-foreground rounded-md border px-2 py-1 text-[11px] font-semibold"
        >
          {amenity.label}
        </li>
      ))}
      {overflowCount > 0 ? (
        <li className="text-muted-foreground px-1 py-1 text-[11px] font-semibold">+{overflowCount} more</li>
      ) : null}
    </ul>
  );
};

/**
 * The search result. Wider than `CourtCard` and carrying what a list reader compares on —
 * address, distance, how big the venue is, the price and the next few times — where the card
 * on the landing page only has to tempt.
 *
 * The mockups also put a star rating on this row. There is still no reviews table, and a
 * fabricated 4.9 next to a real venue name is a lie with the venue's name on it, so the row
 * carries only what the API actually knows.
 */
export const CourtResultRow = ({ court, dateIso, amenityLabels, isHighlighted = false }: CourtResultRowProps) => {
  const courtHref = `/courts/${court.id}?date=${dateIso}`;

  return (
    <li className="list-none">
      {/* `minmax(0,1fr)` rather than `1fr`: a bare `1fr` track is floored at its own
          min-content, and the venue name is `truncate`, which means `white-space: nowrap` and
          a min-content as wide as the whole name. A long one — "Mambaling Sports Complex" —
          pushed the track past the row and the price fell off the clipped right edge. */}
      <article
        className={cn(
          'grid overflow-hidden rounded-md border transition sm:grid-cols-[190px_minmax(0,1fr)]',
          isHighlighted ? 'border-primary' : 'border-border hover:border-primary'
        )}
      >
        <Link href={courtHref} aria-hidden tabIndex={-1} className="hidden overflow-hidden sm:block">
          <VenueImage
            photo={court.venuePhoto}
            sport={court.sport}
            className="h-full w-full"
            glyphClassName="h-14 w-14"
          />
        </Link>

        <div className="flex flex-wrap gap-4 p-4 sm:flex-nowrap">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[17px] font-extrabold tracking-tight">{court.venueName}</h3>

            <p className="text-muted-foreground mt-2 text-[12.5px] font-medium">
              {formatDistance(court.distanceMetres)} · {court.venueAddress}
            </p>
            <p className="text-muted-foreground mt-1.5 text-[12.5px] font-medium">
              {SPORT_LABELS[court.sport]} · {COURT_SURFACE_LABELS[court.surface]} ·{' '}
              {pluraliseCourts(court.venueCourtCount)} · {court.name}
            </p>

            <AmenityChips slugs={court.venueAmenitySlugs} labels={amenityLabels} />

            <div className="mt-3.5 flex flex-wrap gap-1.5">
              <SlotChipList
                courtId={court.id}
                dateIso={dateIso}
                startIsos={court.slotStartIsos}
                venueTimezone={court.venueTimezone}
              />
            </div>
          </div>

          <div className="flex shrink-0 items-end justify-between gap-4 sm:flex-col sm:items-end sm:justify-between">
            {court.fromRatePerHourCents === null ? null : (
              <div className="sm:text-right">
                <p className="text-[22px] font-extrabold leading-none tracking-tight">
                  {formatWholePesos(court.fromRatePerHourCents)}
                </p>
                <p className="text-muted-foreground mt-1 text-[11px] font-medium">from, per hour</p>
              </div>
            )}
            <LinkButton href={courtHref} variant={isHighlighted ? 'secondary' : 'outline'}>
              View court
            </LinkButton>
          </div>
        </div>
      </article>
    </li>
  );
};
