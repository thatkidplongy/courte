import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PageHeader } from './PageHeader';

describe('PageHeader', () => {
  it('renders the title as the page heading, not the eyebrow', () => {
    render(<PageHeader eyebrow="For venue owners" title="Venue dashboard" />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Venue dashboard');
    expect(screen.getByText('For venue owners')).toBeInTheDocument();
  });

  it('omits the subtitle and the actions when they are not supplied', () => {
    render(<PageHeader title="My bookings" />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('My bookings');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
