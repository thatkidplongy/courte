import type { CourtSearchItem } from '@courte/contract';

/**
 * Shared builders for the wire types. A test that needs a court should not have to restate
 * fifteen fields it does not care about, and when the contract grows a field there should be
 * one place to add it rather than one per test file.
 *
 * The defaults are a real Cebu venue at its real coordinates, so anything that does geometry
 * (the results map) is exercised against plausible numbers rather than zeroes.
 */
export const buildCourtSearchItem = (overrides: Partial<CourtSearchItem> = {}): CourtSearchItem => ({
  id: 'court-1',
  name: 'Court A',
  sport: 'badminton',
  surface: 'indoor',
  venueId: 'venue-1',
  venueName: 'El Roi Badminton',
  venueAddress: 'A. S. Fortuna Street, Mandaue',
  venueTimezone: 'Asia/Manila',
  venueCourtCount: 3,
  venueAmenitySlugs: ['aircon', 'parking'],
  venuePhoto: null,
  latitude: 10.3253,
  longitude: 123.9214,
  distanceMetres: 1402,
  fromRatePerHourCents: 30000,
  minDurationMinutes: 60,
  maxDurationMinutes: 180,
  incrementMinutes: 30,
  slotStartIsos: ['2026-08-13T12:00:00.000Z'],
  ...overrides,
});
