'use client';

import 'leaflet/dist/leaflet.css';

import { useEffect, useRef } from 'react';

import { useRouter } from 'next/navigation';

import { OSM_TILE_ATTRIBUTION, OSM_TILE_URL, SINGLE_PIN_ZOOM } from '@/consts';

export type MapPin = {
  venueId: number;
  venueName: string;
  latitude: number;
  longitude: number;
  /** What the pin shows — a price, usually. Kept short; the pin is a label, not a card. */
  label: string;
  href: string;
  isHighlighted: boolean;
};

type ResultsMapProps = {
  pins: MapPin[];
  origin: { latitude: number; longitude: number };
};

const PIN_BASE_CLASSES = 'rounded-md px-2.5 py-1.5 text-[12.5px] font-bold whitespace-nowrap cursor-pointer transition';

const buildPinMarkup = (pin: MapPin): string => {
  const tone = pin.isHighlighted
    ? 'bg-primary text-white border border-primary'
    : 'bg-white text-ink border border-ink';

  return `<span class="${PIN_BASE_CLASSES} ${tone}">${pin.label}</span>`;
};

/**
 * Real tiles at real coordinates. The venues came out of OpenStreetMap and their points are
 * stored as PostGIS geography, so drawing them on an OSM basemap is the same data twice rather
 * than a picture of a map — which is the whole reason the pane is worth having.
 *
 * The map is torn down and rebuilt whenever the pin set changes rather than diffed marker by
 * marker. A results page changes pins only when the reader changes a filter, so the churn is
 * rare, and the alternative is a second source of truth about which markers exist.
 *
 * Leaflet reads `window` as it initialises, so it is imported inside the effect: this component
 * is still server-rendered for its markup, and a top-level import would run there and throw.
 */
export const ResultsMap = ({ pins, origin }: ResultsMapProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pinSignature = pins.map(pin => `${pin.venueId}:${pin.label}:${pin.isHighlighted}`).join('|');

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let isStale = false;
    let teardown: (() => void) | undefined;

    const draw = async () => {
      const leaflet = await import('leaflet');
      if (isStale) return;

      const map = leaflet.map(container, { scrollWheelZoom: false, zoomControl: true });
      teardown = () => map.remove();

      leaflet.tileLayer(OSM_TILE_URL, { maxZoom: 19, attribution: OSM_TILE_ATTRIBUTION }).addTo(map);

      pins.forEach(pin => {
        const marker = leaflet
          .marker([pin.latitude, pin.longitude], {
            title: pin.venueName,
            icon: leaflet.divIcon({
              html: buildPinMarkup(pin),
              className: '',
              iconAnchor: [24, 14],
            }),
          })
          .addTo(map);

        marker.on('click', () => router.push(pin.href));
      });

      if (pins.length === 0) {
        map.setView([origin.latitude, origin.longitude], SINGLE_PIN_ZOOM);
        return;
      }
      if (pins.length === 1 && pins[0]) {
        map.setView([pins[0].latitude, pins[0].longitude], SINGLE_PIN_ZOOM);
        return;
      }

      map.fitBounds(leaflet.latLngBounds(pins.map(pin => [pin.latitude, pin.longitude] as [number, number])), {
        padding: [48, 48],
      });
    };

    void draw();

    return () => {
      isStale = true;
      teardown?.();
    };
    // `pinSignature` deliberately stands in for `pins` here: the array is rebuilt on every
    // render of the parent, so depending on its identity would tear the map down and redraw it
    // on every keystroke elsewhere on the page. The signature changes only when a pin does.
  }, [pinSignature, origin.latitude, origin.longitude, router]);

  return <div ref={containerRef} className="h-full w-full" role="application" aria-label="Map of search results" />;
};
