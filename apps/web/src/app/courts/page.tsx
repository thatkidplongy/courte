import { DateTime } from 'luxon';
import Link from 'next/link';

import { CITY_SEARCH_RADIUS_METRES, COURT_SORTS, SEARCH_DEFAULTS } from '@courte/contract';
import type { CourtSearchItem } from '@courte/contract';

import { auth } from '@/auth';
import { EmptyState } from '@/components/molecules/EmptyState';
import { Pagination } from '@/components/molecules/Pagination';
import { SegmentedControl, type Segment } from '@/components/molecules/SegmentedControl';
import { CourtFilterRail } from '@/components/organisms/CourtFilterRail';
import { CourtResultRow } from '@/components/organisms/CourtResultRow';
import { ResultsMap } from '@/components/organisms/ResultsMap';
import { SearchHeaderBar } from '@/components/organisms/SearchHeaderBar';
import { SearchLayout } from '@/components/templates/SearchLayout';
import { COURT_SORT_SHORT_LABELS, MARKETPLACE_PAGE_SIZE, SPORT_LABELS } from '@/consts';
import { buildAmenityLabelMap } from '@/lib/amenities';
import { fetchAmenities, searchCourts } from '@/lib/api/resources';
import { buildCourtsHref, clearCourtFilters, countActiveFilters, parseCourtFilters } from '@/lib/courtFilters';
import type { CourtFilters } from '@/lib/courtFilters';
import { buildVenuePins } from '@/lib/mapPins';

export const metadata = {
  title: 'Every court in Cebu City — Courte',
  description: 'Browse and book badminton, pickleball, basketball, volleyball, tennis and futsal courts in Cebu City.',
};

const buildSortSegments = (filters: CourtFilters): Segment[] =>
  COURT_SORTS.map(sort => ({
    value: sort,
    label: COURT_SORT_SHORT_LABELS[sort],
    href: buildCourtsHref(filters, { sort, page: 1 }),
  }));

type ResultsHeaderProps = {
  total: number;
  filters: CourtFilters;
};

const ResultsHeader = ({ total, filters }: ResultsHeaderProps) => {
  const activeCount = countActiveFilters(filters);
  const sportLabel = filters.sport ? `${SPORT_LABELS[filters.sport].toLowerCase()} ` : '';

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-[22px] font-extrabold tracking-tight">
          {total} {sportLabel}
          {total === 1 ? 'court' : 'courts'}
        </h1>
        <p className="text-muted-foreground mt-1.5 text-[12.5px] font-medium">
          {SEARCH_DEFAULTS.label} · {DateTime.fromISO(filters.dateIso).toFormat('cccc, d LLLL')}
          {activeCount > 0 ? (
            <>
              {' · '}
              <Link href={buildCourtsHref(clearCourtFilters(filters))} className="text-brand-700 font-bold">
                clear {activeCount === 1 ? 'filter' : `${activeCount} filters`}
              </Link>
            </>
          ) : null}
        </p>
      </div>
      <SegmentedControl label="Sort" segments={buildSortSegments(filters)} value={filters.sort} />
    </div>
  );
};

const ResultList = ({
  courts,
  filters,
  amenityLabels,
  highlightCourtId,
}: {
  courts: CourtSearchItem[];
  filters: CourtFilters;
  amenityLabels: Map<string, string>;
  highlightCourtId?: string;
}) => (
  <ul className="mt-5 flex flex-col gap-3.5">
    {courts.map(court => (
      <CourtResultRow
        key={court.id}
        court={court}
        dateIso={filters.dateIso}
        amenityLabels={amenityLabels}
        isHighlighted={court.id === highlightCourtId}
      />
    ))}
  </ul>
);

type PageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

const MarketplacePage = async ({ searchParams }: PageProps) => {
  const session = await auth();
  const today = DateTime.now().setZone(SEARCH_DEFAULTS.timezone).toFormat('yyyy-MM-dd');
  const filters = parseCourtFilters(await searchParams, today);

  // Two reads with nothing to say to each other, so they go together. The search asks for the
  // city radius rather than the proximity default, so "every court in Cebu City" is the literal
  // result set — the mountain barangays sit outside the 10 km a nearby-search assumes. The
  // catalogue labels the rail's checkboxes and every row's chips, and is the one cacheable
  // read on the page.
  const [{ data, total, page, totalPages }, amenities] = await Promise.all([
    searchCourts({
      date: filters.dateIso,
      sport: filters.sport,
      surface: filters.surface,
      amenities: filters.amenities,
      minRatePerHourCents: filters.minRatePerHourCents,
      maxRatePerHourCents: filters.maxRatePerHourCents,
      sort: filters.sort,
      radiusMetres: CITY_SEARCH_RADIUS_METRES,
      page: filters.page,
      limit: MARKETPLACE_PAGE_SIZE,
    }),
    fetchAmenities(),
  ]);

  const amenityLabels = buildAmenityLabelMap(amenities);

  // The top result carries the highlight, which is what ties the list to the map: the outlined
  // row and the filled pin are the same place. The row is keyed on the court and the pin on its
  // venue — highlighting by venue would outline all six rows of a six-court venue at once.
  const topCourt = data[0];

  return (
    <SearchLayout
      header={
        <SearchHeaderBar sport={filters.sport} dateIso={filters.dateIso} userName={session?.user?.name ?? null} />
      }
      rail={<CourtFilterRail filters={filters} amenities={amenities} />}
      map={
        <ResultsMap
          pins={buildVenuePins(data, filters.dateIso, topCourt?.venueId)}
          origin={{ latitude: SEARCH_DEFAULTS.latitude, longitude: SEARCH_DEFAULTS.longitude }}
        />
      }
    >
      <ResultsHeader total={total} filters={filters} />

      {data.length === 0 ? (
        <EmptyState
          className="mt-6"
          title="Nothing matches those filters"
          description="Try widening the price, switching sport, or looking at another date."
          action={{ href: buildCourtsHref(clearCourtFilters(filters)), label: 'Show every court' }}
        />
      ) : (
        <ResultList courts={data} filters={filters} amenityLabels={amenityLabels} highlightCourtId={topCourt?.id} />
      )}

      <Pagination page={page} totalPages={totalPages} buildHref={next => buildCourtsHref(filters, { page: next })} />
    </SearchLayout>
  );
};

export default MarketplacePage;
