import { describe, expect, it } from 'vitest';

import { buildCourtSearchItem } from '@/test/fixtures';

import { buildVenuePins } from './mapPins';

describe('buildVenuePins', () => {
  it("collapses a venue's courts into one pin", () => {
    const pins = buildVenuePins(
      [
        buildCourtSearchItem({ id: 'a', venueId: 'v1', name: 'Court A' }),
        buildCourtSearchItem({ id: 'b', venueId: 'v1', name: 'Court B' }),
        buildCourtSearchItem({ id: 'c', venueId: 'v2', name: 'Court C' }),
      ],
      '2026-08-13'
    );

    expect(pins).toHaveLength(2);
  });

  it("labels the pin with the venue's cheapest court, not the first one seen", () => {
    const pins = buildVenuePins(
      [
        buildCourtSearchItem({ id: 'a', venueId: 'v1', fromRatePerHourCents: 45000 }),
        buildCourtSearchItem({ id: 'b', venueId: 'v1', fromRatePerHourCents: 18000 }),
      ],
      '2026-08-13'
    );

    expect(pins[0]?.label).toBe('₱180');
    expect(pins[0]?.href).toContain('/courts/b');
  });

  it('falls back to the venue name when nothing there has a public price', () => {
    const pins = buildVenuePins([buildCourtSearchItem({ fromRatePerHourCents: null })], '2026-08-13');

    expect(pins[0]?.label).toBe('El Roi Badminton');
  });

  it('keeps an unpriced court from beating a priced one to the label', () => {
    const pins = buildVenuePins(
      [
        buildCourtSearchItem({ id: 'a', venueId: 'v1', fromRatePerHourCents: null }),
        buildCourtSearchItem({ id: 'b', venueId: 'v1', fromRatePerHourCents: 30000 }),
      ],
      '2026-08-13'
    );

    expect(pins[0]?.label).toBe('₱300');
  });

  it('marks only the highlighted venue', () => {
    const pins = buildVenuePins(
      [buildCourtSearchItem({ id: 'a', venueId: 'v1' }), buildCourtSearchItem({ id: 'b', venueId: 'v2' })],
      '2026-08-13',
      'v2'
    );

    expect(pins.map(pin => pin.isHighlighted)).toEqual([false, true]);
  });

  it('carries the date through to the pin link', () => {
    const pins = buildVenuePins([buildCourtSearchItem({ id: 'a' })], '2026-09-01');

    expect(pins[0]?.href).toBe('/courts/a?date=2026-09-01');
  });
});
