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

/**
 * `min-w-0` is the rule from CONVENTIONS: a flex item is floored at its own min-content, and
 * every control in here is `whitespace-nowrap`, so without it the four cells refuse to shrink
 * and shove the submit button clean off the right of the card. It is the floor that keeps the
 * worst case inside the bar — a long label clips at its cell instead of breaking the card.
 *
 * Cells go full-width, then two-up, then one row: `basis-*` with `flex-wrap` reflows without
 * ever switching display mode, so the dividers below only have to be right in the one-row case.
 */
const CELL_CLASSES = 'min-w-0 basis-full px-3.5 py-2 @xs:basis-1/2 @min-[45rem]:basis-auto @min-[45rem]:grow';

/**
 * Submits to the marketplace, not back to itself. The hero is an entry point; browsing happens
 * on the listing, so searching leaves this page carrying the sport and date across.
 *
 * Location is a fixed label rather than a control: the search origin is Fuente Osmeña for
 * everyone until geolocation or a place autocomplete lands. Showing a disabled input would
 * imply it is coming; a label states the truth.
 *
 * The bar sizes off **its own width, not the viewport** (`@container`), because it lives in the
 * hero's copy column, and that column is narrower at 1024 than the whole page is at 700. A `sm:`
 * breakpoint read the viewport, turned the bar horizontal at 640px and left the green button
 * hanging outside the card at every desktop width.
 *
 * 45rem is measured, not chosen: one row of four fields at this padding floors at 718px, so the
 * bar goes horizontal at 720 and not a pixel earlier. Below it the fields go two-up with the
 * button full-width beneath them. Widening the cells means re-measuring the floor and moving
 * every `@min-[45rem]` with it — the two numbers are a pair.
 *
 * The shadow is the one place the flat system allows one — the bar is a white card sitting on
 * the night hero, and elevation is what says it is in front rather than part of it.
 *
 * `text-foreground` is not decoration: the bar renders inside a section carrying `text-white`,
 * and a white card inheriting white text is invisible. Setting it here rather than at the call
 * site keeps the bar legible wherever it is dropped.
 */
export const HeroSearchBar = ({ sport, dateIso, time }: HeroSearchBarProps) => (
  <div className="@container">
    <form
      method="GET"
      action="/courts"
      className="border-border divide-border text-foreground @min-[45rem]:flex-nowrap @min-[45rem]:items-stretch @min-[45rem]:divide-x flex flex-wrap rounded-md border bg-white p-2 shadow-xl"
      aria-label="Search courts"
    >
      <ControlGroup label="Sport" className={CELL_CLASSES}>
        <SelectField name={COURT_FILTER_FIELDS.sport} defaultValue={sport} options={SPORT_OPTIONS} />
      </ControlGroup>

      <ControlGroup label="Location" className={CELL_CLASSES}>
        {/* `whitespace-nowrap`: the cell is a flex item floored at its own min-content, so without
            it "Cebu City" breaks over two lines the moment a fourth field joins the bar. */}
        <span className="flex h-10 items-center gap-1.5 whitespace-nowrap text-[13px] font-semibold">
          <PinIcon className="text-primary h-3.5 w-3.5 shrink-0" />
          {SEARCH_DEFAULTS.label}
        </span>
      </ControlGroup>

      <ControlGroup label="Date" className={CELL_CLASSES}>
        <DateField name={COURT_FILTER_FIELDS.date} defaultValue={dateIso} />
      </ControlGroup>

      <ControlGroup label="Time" className={CELL_CLASSES}>
        <SelectField name={COURT_FILTER_FIELDS.time} defaultValue={time ?? ANY_FILTER_VALUE} options={TIME_OPTIONS} />
      </ControlGroup>

      <div className="@min-[45rem]:basis-auto @min-[45rem]:items-stretch @min-[45rem]:pl-3.5 @min-[45rem]:pr-0 flex basis-full items-end p-2">
        {/* `h-full` fills the cell in one-row mode, where the wrapping cell is a stretched flex
            item with a definite height. Wrapped, that height is auto and the percentage collapses
            — `min-h-11` is what keeps the button a button there. */}
        <Button type="submit" size="lg" className="@min-[45rem]:w-auto h-full min-h-11 w-full">
          <SearchIcon className="h-4 w-4" />
          Search courts
        </Button>
      </div>
    </form>
  </div>
);
