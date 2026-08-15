import { SEARCH_DEFAULTS, SPORTS, type Sport } from '@courte/contract';

import { PinIcon, SearchIcon } from '@/components/atoms/Icon';
import { ControlGroup } from '@/components/molecules/ControlGroup';
import { DateField } from '@/components/molecules/DateField';
import { SelectField, type SelectOption } from '@/components/molecules/SelectField';
import { Button } from '@/components/shadcn/ui/button';
import { COURT_FILTER_FIELDS, SPORT_LABELS } from '@/consts';

type HeroSearchBarProps = {
  sport: Sport;
  dateIso: string;
};

const SPORT_OPTIONS: SelectOption[] = SPORTS.map(sport => ({ value: sport, label: SPORT_LABELS[sport] }));

const CELL_CLASSES = 'flex-1 px-3 py-2';

/**
 * Submits to the marketplace, not back to itself. The hero is an entry point; browsing happens
 * on the listing, so searching leaves this page carrying the sport and date across.
 *
 * Location is a fixed label rather than a control: the search origin is Fuente Osmeña for
 * everyone until geolocation or a place autocomplete lands. Showing a disabled input would
 * imply it is coming; a label states the truth.
 *
 * The shadow is the one place the flat system allows one — the bar genuinely floats over the
 * seam between the night hero and the page below it, and elevation is what says so.
 */
export const HeroSearchBar = ({ sport, dateIso }: HeroSearchBarProps) => (
  <form
    method="GET"
    action="/courts"
    className="border-border divide-border flex flex-col rounded-md border bg-white p-2 shadow-xl sm:flex-row sm:items-stretch sm:divide-x"
    aria-label="Search courts"
  >
    <ControlGroup label="Sport" className={CELL_CLASSES}>
      <SelectField name={COURT_FILTER_FIELDS.sport} defaultValue={sport} options={SPORT_OPTIONS} />
    </ControlGroup>

    <ControlGroup label="Location" className={CELL_CLASSES}>
      <span className="flex h-10 items-center gap-1.5 text-[13px] font-semibold">
        <PinIcon className="text-primary h-3.5 w-3.5" />
        {SEARCH_DEFAULTS.label}
      </span>
    </ControlGroup>

    <ControlGroup label="Date" className={CELL_CLASSES}>
      <DateField name={COURT_FILTER_FIELDS.date} defaultValue={dateIso} />
    </ControlGroup>

    <div className="flex items-end p-2 sm:items-stretch sm:pb-2 sm:pl-3 sm:pr-0 sm:pt-2">
      <Button type="submit" size="lg" className="h-full w-full sm:w-auto">
        <SearchIcon className="h-4 w-4" />
        Search courts
      </Button>
    </div>
  </form>
);
