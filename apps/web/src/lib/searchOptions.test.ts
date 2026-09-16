import { describe, expect, it } from 'vitest';

import { SPORTS } from '@courte/contract';

import { ANY_FILTER_VALUE, SEARCH_TIME_OPTIONS } from '@/consts';

import { SPORT_OPTIONS, SPORT_OPTIONS_WITH_ANY, TIME_OPTIONS } from './searchOptions';

describe('SPORT_OPTIONS', () => {
  it('offers every sport the contract defines, so a new one cannot be missed by a surface', () => {
    expect(SPORT_OPTIONS.map(option => option.value)).toEqual([...SPORTS]);
  });

  it('labels each sport rather than leaking the raw slug', () => {
    expect(SPORT_OPTIONS.map(option => option.label)).not.toContain('pickleball');
    expect(SPORT_OPTIONS.every(option => option.label.length > 0)).toBe(true);
  });

  it('has no "any" entry — a court must resolve to one sport', () => {
    expect(SPORT_OPTIONS.some(option => option.value === ANY_FILTER_VALUE)).toBe(false);
  });
});

describe('SPORT_OPTIONS_WITH_ANY', () => {
  it('leads with "All sports", so clearing the filter is the first thing reachable', () => {
    expect(SPORT_OPTIONS_WITH_ANY[0]).toEqual({ value: ANY_FILTER_VALUE, label: 'All sports' });
  });

  it('otherwise matches the plain list, so the two cannot drift apart', () => {
    expect(SPORT_OPTIONS_WITH_ANY.slice(1)).toEqual(SPORT_OPTIONS);
  });
});

describe('TIME_OPTIONS', () => {
  it('leads with "Any time", which is what an unfiltered bar opens on', () => {
    expect(TIME_OPTIONS[0]).toEqual({ value: ANY_FILTER_VALUE, label: 'Any time' });
  });

  it('offers exactly the starts the filter parser will accept', () => {
    expect(TIME_OPTIONS.slice(1).map(option => option.value)).toEqual(SEARCH_TIME_OPTIONS);
  });

  it('renders the starts as clock labels rather than 24-hour values', () => {
    expect(TIME_OPTIONS.slice(1).map(option => option.label)).toContain('6:00 AM');
  });
});
