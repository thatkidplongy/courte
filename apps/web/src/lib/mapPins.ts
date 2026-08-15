import type { CourtSearchItem } from '@courte/contract';

import type { MapPin } from '@/components/organisms/ResultsMap';

import { formatWholePesos } from './format';

/**
 * One pin per venue, not per court. Every court at a venue shares the venue's point, so a
 * six-court venue would otherwise stack six markers on the same pixel and read as one — while
 * quietly making the map look busier than the city is.
 *
 * The pin shows the venue's cheapest bookable rate, which is the number a reader scanning a map
 * is comparing. A venue whose courts are all unpriced still gets a pin, labelled with its
 * distance instead: it exists and it is nearby, which is what the map is for.
 */
export const buildVenuePins = (courts: CourtSearchItem[], dateIso: string, highlightVenueId?: number): MapPin[] => {
  const byVenue = new Map<number, { court: CourtSearchItem; cheapestCents: number | null }>();

  courts.forEach(court => {
    const existing = byVenue.get(court.venueId);
    const rate = court.fromRatePerHourCents;

    if (!existing) {
      byVenue.set(court.venueId, { court, cheapestCents: rate });
      return;
    }
    if (rate !== null && (existing.cheapestCents === null || rate < existing.cheapestCents)) {
      byVenue.set(court.venueId, { court, cheapestCents: rate });
    }
  });

  return [...byVenue.values()].map(({ court, cheapestCents }) => ({
    venueId: court.venueId,
    venueName: court.venueName,
    latitude: court.latitude,
    longitude: court.longitude,
    label: cheapestCents === null ? court.venueName : formatWholePesos(cheapestCents),
    href: `/courts/${court.id}?date=${dateIso}`,
    isHighlighted: court.venueId === highlightVenueId,
  }));
};
