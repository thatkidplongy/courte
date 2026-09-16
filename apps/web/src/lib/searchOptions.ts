import { SPORTS } from '@courte/contract';

import type { SelectOption } from '@/components/molecules/SelectField';
import { ANY_FILTER_VALUE, SEARCH_TIME_OPTIONS, SPORT_LABELS } from '@/consts';
import { formatClockLabel } from '@/lib/format';

/**
 * The dropdown contents every search surface shares. They live here rather than in each bar
 * because the hero, the /courts header and the owner's court form were each deriving them from
 * `SPORTS` independently — three copies of one list, and a new sport added to the contract would
 * have appeared in all three or none depending on which copy someone remembered.
 */

/** Every sport, in contract order. For a control that must resolve to one — a court has a sport. */
export const SPORT_OPTIONS: SelectOption[] = SPORTS.map(sport => ({ value: sport, label: SPORT_LABELS[sport] }));

const ANY_SPORT_OPTION: SelectOption = { value: ANY_FILTER_VALUE, label: 'All sports' };

/** For a filter, where "no answer" is a legitimate answer and has to be reachable. */
export const SPORT_OPTIONS_WITH_ANY: SelectOption[] = [ANY_SPORT_OPTION, ...SPORT_OPTIONS];

/**
 * "Any time" leads, and is what a search bar opens on. A bar that arrives pre-filtered to 6 PM
 * hides every court free at nine and looks like the city has fewer courts than it has.
 */
export const TIME_OPTIONS: SelectOption[] = [
  { value: ANY_FILTER_VALUE, label: 'Any time' },
  ...SEARCH_TIME_OPTIONS.map(time => ({ value: time, label: formatClockLabel(time) })),
];
