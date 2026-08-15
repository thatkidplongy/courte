import { describe, expect, it } from 'vitest';

import { buildCourtSearchItem } from '@/test/fixtures';

import { buildVenuePins } from './mapPins';

describe('buildVenuePins', () => {
  it("collapses a venue's courts into one pin", () => {
    const pins = buildVenuePins(
      [
        buildCourtSearchItem({ id: 1, venueId: 1, name: 'Court A' }),
        buildCourtSearchItem({ id: 2, venueId: 1, name: 'Court B' }),
        buildCourtSearchItem({ id: 3, venueId: 2, name: 'Court C' }),
      ],
      '2026-08-13'
    );

    expect(pins).toHaveLength(2);
  });

  it("labels the pin with the venue's cheapest court, not the first one seen", () => {
    const pins = buildVenuePins(
      [
        buildCourtSearchItem({ id: 1, venueId: 1, fromRatePerHourCents: 45000 }),
        buildCourtSearchItem({ id: 2, venueId: 1, fromRatePerHourCents: 18000 }),
      ],
      '2026-08-13'
    );

    expect(pins[0]?.label).toBe('₱180');
    expect(pins[0]?.href).toContain('/courts/2');
  });

  it('falls back to the venue name when nothing there has a public price', () => {
    const pins = buildVenuePins([buildCourtSearchItem({ fromRatePerHourCents: null })], '2026-08-13');

    expect(pins[0]?.label).toBe('El Roi Badminton');
  });

  it('keeps an unpriced court from beating a priced one to the label', () => {
    const pins = buildVenuePins(
      [
        buildCourtSearchItem({ id: 1, venueId: 1, fromRatePerHourCents: null }),
        buildCourtSearchItem({ id: 2, venueId: 1, fromRatePerHourCents: 30000 }),
      ],
      '2026-08-13'
    );

    expect(pins[0]?.label).toBe('₱300');
  });

  it('marks only the highlighted venue', () => {
    const pins = buildVenuePins(
      [buildCourtSearchItem({ id: 1, venueId: 1 }), buildCourtSearchItem({ id: 2, venueId: 2 })],
      '2026-08-13',
      2
    );

    expect(pins.map(pin => pin.isHighlighted)).toEqual([false, true]);
  });

  it('carries the date through to the pin link', () => {
    const pins = buildVenuePins([buildCourtSearchItem({ id: 1 })], '2026-09-01');

    expect(pins[0]?.href).toBe('/courts/1?date=2026-09-01');
  });
});
