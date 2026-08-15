import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { buildCourtSearchItem } from '@/test/fixtures';

import { CourtResultRow } from './CourtResultRow';

const LABELS = new Map([
  ['aircon', 'Air conditioning'],
  ['parking', 'Parking'],
  ['showers', 'Showers'],
  ['rentals', 'Equipment rental'],
  ['lights', 'Night lights'],
]);

const renderRow = (court = buildCourtSearchItem()) =>
  render(<CourtResultRow court={court} dateIso="2026-08-13" amenityLabels={LABELS} />);

describe('CourtResultRow', () => {
  it('resolves amenity slugs to their labels', () => {
    renderRow();

    expect(screen.getByText('Air conditioning')).toBeInTheDocument();
    expect(screen.getByText('Parking')).toBeInTheDocument();
  });

  it('counts the amenities that did not fit rather than listing all of them', () => {
    renderRow(buildCourtSearchItem({ venueAmenitySlugs: ['aircon', 'parking', 'showers', 'rentals', 'lights'] }));

    expect(screen.getByText('+2 more')).toBeInTheDocument();
    expect(screen.queryByText('Night lights')).not.toBeInTheDocument();
  });

  it('says nothing about amenities when the venue has claimed none', () => {
    renderRow(buildCourtSearchItem({ venueAmenitySlugs: [] }));

    expect(screen.queryByText(/more/)).not.toBeInTheDocument();
    expect(screen.queryByText('Parking')).not.toBeInTheDocument();
  });

  it('names the surface, including covered', () => {
    renderRow(buildCourtSearchItem({ surface: 'covered' }));

    expect(screen.getByText(/Covered/)).toBeInTheDocument();
  });

  /**
   * The state every venue is in until upload lands. The row must still be complete — no broken
   * image, no empty frame where a photo would be.
   */
  it('falls back to the sport glyph when the venue has no photo', () => {
    const { container } = renderRow(buildCourtSearchItem({ venuePhoto: null }));

    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('El Roi Badminton')).toBeInTheDocument();
  });

  it('shows the venue photo when there is one', () => {
    renderRow(buildCourtSearchItem({ venuePhoto: { url: 'https://cdn.test/hall.jpg', alt: 'The main hall' } }));

    expect(screen.getByAltText('The main hall')).toHaveAttribute('src', 'https://cdn.test/hall.jpg');
  });
});
