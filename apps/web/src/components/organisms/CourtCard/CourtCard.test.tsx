import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { buildCourtSearchItem as buildCourt } from '@/test/fixtures';

import { CourtCard } from './CourtCard';

describe('CourtCard', () => {
  it('names the venue and the court, and reports the distance', () => {
    render(<CourtCard court={buildCourt()} dateIso="2026-08-13" />);

    expect(screen.getByText('El Roi Badminton')).toBeInTheDocument();
    expect(screen.getByText('Court A')).toBeInTheDocument();
    expect(screen.getByText('1.4 km')).toBeInTheDocument();
  });

  it('renders each slot in the venue zone, linking to that exact start', () => {
    render(<CourtCard court={buildCourt()} dateIso="2026-08-13" />);

    const chip = screen.getByRole('link', { name: '8:00 PM' });
    expect(chip).toHaveAttribute('href', '/courts/court-1?date=2026-08-13&start=2026-08-13T12%3A00%3A00.000Z');
  });

  /**
   * The distinction the card must not blur: an empty slot list can mean booked out or simply
   * closed, and the copy has to survive both readings.
   */
  it('says no times are left rather than claiming the court is fully booked', () => {
    render(<CourtCard court={buildCourt({ slotStartIsos: [] })} dateIso="2026-08-13" />);

    expect(screen.getByText('No times left')).toBeInTheDocument();
    expect(screen.queryByText(/fully booked/i)).not.toBeInTheDocument();
  });

  it('omits the rate entirely when the court has no public price rule', () => {
    render(<CourtCard court={buildCourt({ fromRatePerHourCents: null })} dateIso="2026-08-13" />);

    expect(screen.queryByText(/from/)).not.toBeInTheDocument();
    expect(screen.queryByText(/₱/)).not.toBeInTheDocument();
  });

  it('marks an outdoor court as outdoor', () => {
    render(<CourtCard court={buildCourt({ surface: 'outdoor' })} dateIso="2026-08-13" />);

    expect(screen.getByText('Outdoor')).toBeInTheDocument();
  });

  it('marks a covered court as covered rather than collapsing it into indoor', () => {
    render(<CourtCard court={buildCourt({ surface: 'covered' })} dateIso="2026-08-13" />);

    expect(screen.getByText('Covered')).toBeInTheDocument();
  });
});
