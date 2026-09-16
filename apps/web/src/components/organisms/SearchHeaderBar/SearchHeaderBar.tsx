import type { ReactNode } from 'react';

import Link from 'next/link';

import { SEARCH_DEFAULTS, type Sport } from '@courte/contract';

import { Avatar } from '@/components/atoms/Avatar';
import { CourtMark, PinIcon, SearchIcon } from '@/components/atoms/Icon';
import { DateField } from '@/components/molecules/DateField';
import { SelectField } from '@/components/molecules/SelectField';
import { ANY_FILTER_VALUE, COURT_FILTER_FIELDS } from '@/consts';
import { SPORT_OPTIONS_WITH_ANY, TIME_OPTIONS } from '@/lib/searchOptions';

type SearchHeaderBarProps = {
  sport: Sport | undefined;
  dateIso: string;
  /** The wall-clock start being filtered on, or undefined for any time of day. */
  time: string | undefined;
  /** The signed-in user's display name, or null when nobody is signed in. */
  userName: string | null;
};

/**
 * Control on top, caption beneath — the reverse of a form field, and what the mockups draw.
 *
 * `min-w-0` is load-bearing: a flex item is floored at its own min-content, so on a phone the
 * three cells refused to shrink and pushed the submit button off the right of the viewport,
 * giving the whole page a sideways scroll.
 */
const SearchCell = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="border-border min-w-0 flex-1 border-r px-3.5 py-2 last:border-r-0">
    {children}
    <p className="text-muted-foreground mt-0.5 text-[10px] font-medium">{label}</p>
  </div>
);

/** Stripped to sit inside the bar: the bar is the border, so the controls must not draw one. */
const BARE_CONTROL = 'h-auto w-full justify-between border-0 p-0 text-[13px] font-semibold shadow-none';

/**
 * The search page's own chrome. It replaces the marketing header rather than sitting under it —
 * once you are searching, the search *is* the navigation, which is why /courts renders this and
 * the site header lives only on the pages that are still selling something.
 */
export const SearchHeaderBar = ({ sport, dateIso, time, userName }: SearchHeaderBarProps) => (
  <header className="border-ink flex h-auto flex-wrap items-center gap-4 border-b-2 px-5 py-3 lg:h-[66px] lg:flex-nowrap lg:gap-5 lg:py-0">
    <Link href="/" className="flex items-center gap-2.5">
      <CourtMark className="text-primary h-5 w-5" />
      <span className="text-base font-extrabold tracking-[0.14em]">COURTE</span>
    </Link>

    <form
      method="GET"
      action="/courts"
      aria-label="Search courts"
      className="border-border order-last flex w-full flex-1 items-stretch rounded-md border lg:order-none lg:max-w-[660px]"
    >
      <SearchCell label="Sport">
        <SelectField
          name={COURT_FILTER_FIELDS.sport}
          defaultValue={sport ?? ANY_FILTER_VALUE}
          options={SPORT_OPTIONS_WITH_ANY}
          className={BARE_CONTROL}
        />
      </SearchCell>

      <SearchCell label="Location">
        <span className="flex items-center gap-1.5 text-[13px] font-semibold">
          <PinIcon className="text-primary h-3.5 w-3.5" />
          {SEARCH_DEFAULTS.label}
        </span>
      </SearchCell>

      <SearchCell label="Date">
        <DateField name={COURT_FILTER_FIELDS.date} defaultValue={dateIso} triggerClassName={BARE_CONTROL} />
      </SearchCell>

      <SearchCell label="Time">
        <SelectField
          name={COURT_FILTER_FIELDS.time}
          defaultValue={time ?? ANY_FILTER_VALUE}
          options={TIME_OPTIONS}
          className={BARE_CONTROL}
        />
      </SearchCell>

      <button
        type="submit"
        aria-label="Search"
        className="bg-primary hover:bg-brand-700 flex items-center rounded-r-[5px] px-4 text-white transition"
      >
        <SearchIcon className="h-4 w-4" />
      </button>
    </form>

    <div className="text-muted-foreground ml-auto flex items-center gap-4 text-[13px] font-medium">
      <Link href="/bookings" className="hover:text-foreground transition">
        My bookings
      </Link>
      {userName ? <Avatar name={userName} /> : null}
    </div>
  </header>
);
