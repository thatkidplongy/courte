import Link from 'next/link';

import type { CourtSearchItem } from '@courte/contract';

import { DistanceTag } from '@/components/atoms/DistanceTag';
import { ArrowRightIcon } from '@/components/atoms/Icon';
import { PriceTag } from '@/components/atoms/PriceTag';
import { SportBadge } from '@/components/atoms/SportBadge';
import { SurfaceBadge } from '@/components/atoms/SurfaceBadge';
import { VenueImage } from '@/components/atoms/VenueImage';
import { SlotChipList } from '@/components/molecules/SlotChipList';

type CourtCardProps = {
  court: CourtSearchItem;
  dateIso: string;
};

/**
 * The one card the landing teaser and the marketplace both render. It decides nothing about
 * availability or price — `slotStartIsos` and `fromRatePerHourCents` arrive already resolved
 * by the API, so a second client asking the same question gets the same answer.
 *
 * The banner shows the venue's photo where there is one. Most venues have none yet, and
 * `VenueImage` falls back to the sport's glyph on a tinted panel — a grey box reads as a
 * failed image load, where a drawn mark reads as deliberate and still names the sport.
 */
export const CourtCard = ({ court, dateIso }: CourtCardProps) => {
  const courtHref = `/courts/${court.id}?date=${dateIso}`;

  return (
    <li className="list-none">
      <article className="border-border hover:border-primary group h-full rounded-md border transition">
        <Link href={courtHref} className="relative block h-32 overflow-hidden rounded-t-md">
          <VenueImage
            photo={court.venuePhoto}
            sport={court.sport}
            className="h-full w-full"
            glyphClassName="h-16 w-16"
          />
          <SurfaceBadge surface={court.surface} className="absolute right-3 top-3" />
        </Link>

        <div className="p-4">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="truncate text-sm font-bold">{court.venueName}</h3>
            <DistanceTag metres={court.distanceMetres} />
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
            <SportBadge sport={court.sport} />
            <span className="text-muted-foreground text-xs" aria-hidden>
              ·
            </span>
            <span className="text-muted-foreground text-xs font-medium">{court.name}</span>
          </div>

          <PriceTag cents={court.fromRatePerHourCents} className="mt-3" />

          <div className="border-border mt-4 flex flex-wrap items-center gap-1.5 border-t pt-4">
            <SlotChipList
              courtId={court.id}
              dateIso={dateIso}
              startIsos={court.slotStartIsos}
              venueTimezone={court.venueTimezone}
            />
            <Link
              href={courtHref}
              className="text-brand-700 hover:text-ink ml-auto flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.08em] transition"
            >
              All times
              <ArrowRightIcon className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </article>
    </li>
  );
};
