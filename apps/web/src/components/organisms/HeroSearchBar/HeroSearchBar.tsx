import { SEARCH_DEFAULTS, SPORTS, type Sport } from '@courte/contract';

import { PinIcon, SearchIcon } from '@/components/atoms/Icon';
import { ControlGroup } from '@/components/molecules/ControlGroup';
import { DateField } from '@/components/molecules/DateField';
import { SelectField, type SelectOption } from '@/components/molecules/SelectField';
import { Button } from '@/components/shadcn/ui/button';
import { ANY_FILTER_VALUE, COURT_FILTER_FIELDS, SEARCH_TIME_OPTIONS, SPORT_LABELS } from '@/consts';
import { formatClockLabel } from '@/lib/format';

type HeroSearchBarProps = {
  sport: Sport;
  dateIso: string;
  time?: string;
};

const SPORT_OPTIONS: SelectOption[] = SPORTS.map(sport => ({ value: sport, label: SPORT_LABELS[sport] }));

/**
 * "Any time" leads, and is what the bar opens on. A search bar that arrives pre-filtered to
 * 6 PM hides every court free at nine and looks like the city has fewer courts than it has.
 */
const TIME_OPTIONS: SelectOption[] = [
  { value: ANY_FILTER_VALUE, label: 'Any time' },
  ...SEARCH_TIME_OPTIONS.map(time => ({ value: time, label: formatClockLabel(time) })),
];

const CELL_CLASSES = 'flex-1 px-3 py-2';

/**
 * Submits to the marketplace, not back to itself. The hero is an entry point; browsing happens
 * on the listing, so searching leaves this page carrying the sport and date across.
 *
 * Location is a fixed label rather than a control: the search origin is Fuente Osmeña for
 * everyone until geolocation or a place autocomplete lands. Showing a disabled input would
 * imply it is coming; a label states the truth.
 *
 * The shadow is the one place the flat system allows one — the bar is a white card sitting on
 * the night hero, and elevation is what says it is in front rather than part of it.
 *
 * `text-foreground` is not decoration: the bar renders inside a section carrying `text-white`,
 * and a white card inheriting white text is invisible. Setting it here rather than at the call
 * site keeps the bar legible wherever it is dropped.
 */
export const HeroSearchBar = ({ sport, dateIso, time }: HeroSearchBarProps) => (
  <form
    method="GET"
    action="/courts"
    className="border-border divide-border text-foreground flex flex-col rounded-md border bg-white p-2 shadow-xl sm:flex-row sm:items-stretch sm:divide-x"
    aria-label="Search courts"
  >
    <ControlGroup label="Sport" className={CELL_CLASSES}>
      <SelectField name={COURT_FILTER_FIELDS.sport} defaultValue={sport} options={SPORT_OPTIONS} />
    </ControlGroup>

    <ControlGroup label="Location" className={CELL_CLASSES}>
      {/* `whitespace-nowrap`: the cell is a flex item floored at its own min-content, so without
          it "Cebu City" breaks over two lines the moment a fourth field joins the bar. */}
      <span className="flex h-10 items-center gap-1.5 whitespace-nowrap text-[13px] font-semibold">
        <PinIcon className="text-primary h-3.5 w-3.5" />
        {SEARCH_DEFAULTS.label}
      </span>
    </ControlGroup>

    <ControlGroup label="Date" className={CELL_CLASSES}>
      <DateField name={COURT_FILTER_FIELDS.date} defaultValue={dateIso} />
    </ControlGroup>

    <ControlGroup label="Time" className={CELL_CLASSES}>
      <SelectField name={COURT_FILTER_FIELDS.time} defaultValue={time ?? ANY_FILTER_VALUE} options={TIME_OPTIONS} />
    </ControlGroup>

    <div className="flex items-end p-2 sm:items-stretch sm:pb-2 sm:pl-3 sm:pr-0 sm:pt-2">
      <Button type="submit" size="lg" className="h-full w-full sm:w-auto">
        <SearchIcon className="h-4 w-4" />
        Search courts
      </Button>
    </div>
  </form>
);
