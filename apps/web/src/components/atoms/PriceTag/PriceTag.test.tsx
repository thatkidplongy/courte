import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PriceTag } from './PriceTag';

describe('PriceTag', () => {
  it('renders the hourly rate in whole pesos', () => {
    render(<PriceTag cents={30000} />);

    expect(screen.getByText('₱300')).toBeInTheDocument();
    expect(screen.getByText(/from/)).toBeInTheDocument();
    expect(screen.getByText(/\/hr/)).toBeInTheDocument();
  });

  /** Quoting ₱0 for an unpriced court would advertise a price we are not offering. */
  it('renders nothing when there is no public rate', () => {
    const { container } = render(<PriceTag cents={null} />);

    expect(container).toBeEmptyDOMElement();
  });
});
