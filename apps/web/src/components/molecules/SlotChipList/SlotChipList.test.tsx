import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SlotChipList } from './SlotChipList';

const props = {
  courtId: 'court-1',
  dateIso: '2026-08-13',
  venueTimezone: 'Asia/Manila',
};

describe('SlotChipList', () => {
  it('renders one chip per start, in the venue zone', () => {
    render(<SlotChipList {...props} startIsos={['2026-08-13T12:00:00.000Z', '2026-08-13T12:30:00.000Z']} />);

    expect(screen.getByRole('link', { name: '8:00 PM' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '8:30 PM' })).toBeInTheDocument();
  });

  it('links each chip to that exact start, url-encoded', () => {
    render(<SlotChipList {...props} startIsos={['2026-08-13T12:00:00.000Z']} />);

    expect(screen.getByRole('link', { name: '8:00 PM' })).toHaveAttribute(
      'href',
      '/courts/court-1?date=2026-08-13&start=2026-08-13T12%3A00%3A00.000Z'
    );
  });

  /** The distinction the copy must not blur: taken and closed both produce an empty list. */
  it('says no times are left rather than claiming the court is fully booked', () => {
    render(<SlotChipList {...props} startIsos={[]} />);

    expect(screen.getByText('No times left')).toBeInTheDocument();
    expect(screen.queryByText(/fully booked/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
