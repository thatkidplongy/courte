'use client';

import { useRouter } from 'next/navigation';

import {
  COURT_SURFACES,
  PRICE_FILTER_MAX_CENTS,
  PRICE_FILTER_MIN_CENTS,
  SPORTS,
  type Amenity,
  type CourtSurface,
} from '@courte/contract';

import { FieldLabel } from '@/components/atoms/FieldLabel';
import { PriceRangeField } from '@/components/molecules/PriceRangeField';
import { Checkbox } from '@/components/shadcn/ui/checkbox';
import { COURT_SURFACE_LABELS, SPORT_LABELS } from '@/consts';
import { buildCourtsHref, type CourtFilters } from '@/lib/courtFilters';
import { cn } from '@/lib/utils';

type CourtFilterRailProps = {
  filters: CourtFilters;
  /** The catalogue, fetched once by the page. An empty list hides the section entirely. */
  amenities: Amenity[];
};

const RailSection = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="mb-7">
    <FieldLabel className="mb-3 block">{label}</FieldLabel>
    {children}
  </div>
);

/**
 * The rail has no Apply button, because the design has none: every change is a navigation, and
 * the page re-renders from the new URL on the server. That is also why this is a client
 * component holding no filter state of its own — the URL is the state, and pushing to it is the
 * only mutation. Reading the answer back out of `filters` keeps a back-button press honest.
 */
export const CourtFilterRail = ({ filters, amenities }: CourtFilterRailProps) => {
  const router = useRouter();

  const apply = (overrides: Partial<CourtFilters>) => {
    router.push(buildCourtsHref(filters, { ...overrides, page: 1 }));
  };

  /**
   * Every box ticked and none ticked mean the same thing — show everything — so the group
   * behaves as a four-state without needing an explicit "any" control.
   */
  const toggleSurface = (surface: CourtSurface) => {
    apply({ surface: filters.surface === surface ? undefined : surface });
  };

  /**
   * Amenities are additive, unlike surface: ticking a second one narrows further rather than
   * replacing the first, which is what the AND semantics on the API side mean in the hand.
   */
  const toggleAmenity = (slug: string) => {
    const next = filters.amenities.includes(slug)
      ? filters.amenities.filter(current => current !== slug)
      : [...filters.amenities, slug];

    apply({ amenities: next });
  };

  return (
    <aside className="border-border shrink-0 lg:w-[236px] lg:border-r">
      <div className="px-5 py-6 lg:px-[22px]">
        <h2 className="mb-5 text-[15px] font-extrabold tracking-tight">Filters</h2>

        <RailSection label="Price per hour">
          <PriceRangeField
            minCents={filters.minRatePerHourCents ?? PRICE_FILTER_MIN_CENTS}
            maxCents={filters.maxRatePerHourCents ?? PRICE_FILTER_MAX_CENTS}
            onCommit={({ minCents, maxCents }) =>
              apply({
                minRatePerHourCents: minCents === PRICE_FILTER_MIN_CENTS ? undefined : minCents,
                maxRatePerHourCents: maxCents === PRICE_FILTER_MAX_CENTS ? undefined : maxCents,
              })
            }
          />
        </RailSection>

        <RailSection label="Surface">
          <div className="flex flex-col gap-2.5">
            {COURT_SURFACES.map(surface => (
              <label key={surface} className="flex cursor-pointer items-center gap-2.5 text-[13px] font-medium">
                <Checkbox
                  checked={filters.surface === undefined || filters.surface === surface}
                  onCheckedChange={() => toggleSurface(surface)}
                />
                {COURT_SURFACE_LABELS[surface]}
              </label>
            ))}
          </div>
        </RailSection>

        {amenities.length > 0 ? (
          <RailSection label="Amenities">
            <div className="flex flex-col gap-2.5">
              {amenities.map(amenity => (
                <label key={amenity.slug} className="flex cursor-pointer items-center gap-2.5 text-[13px] font-medium">
                  <Checkbox
                    checked={filters.amenities.includes(amenity.slug)}
                    onCheckedChange={() => toggleAmenity(amenity.slug)}
                  />
                  {amenity.label}
                </label>
              ))}
            </div>
          </RailSection>
        ) : null}

        <RailSection label="Sport">
          <div className="flex flex-wrap gap-1.5">
            {SPORTS.map(sport => {
              const isSelected = filters.sport === sport;

              return (
                <button
                  key={sport}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => apply({ sport: isSelected ? undefined : sport })}
                  className={cn(
                    'rounded-md border px-2.5 py-1.5 text-[11.5px] font-semibold transition',
                    isSelected
                      ? 'border-primary bg-accent text-accent-foreground'
                      : 'border-border hover:border-primary'
                  )}
                >
                  {SPORT_LABELS[sport]}
                </button>
              );
            })}
          </div>
        </RailSection>
      </div>
    </aside>
  );
};
