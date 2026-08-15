import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StarRating } from './StarRating';

describe('StarRating', () => {
  it('shows the average to one decimal and the count', () => {
    render(<StarRating rating={{ average: 4.75, count: 12, isTopRated: false }} />);

    expect(screen.getByText('4.8')).toBeInTheDocument();
    expect(screen.getByText('(12 reviews)')).toBeInTheDocument();
  });

  it('says review, singular, for one', () => {
    render(<StarRating rating={{ average: 5, count: 1, isTopRated: false }} />);

    expect(screen.getByText('(1 review)')).toBeInTheDocument();
  });

  /**
   * The case that matters most: an unrated venue is not a zero-star venue, and drawing greyed
   * stars beside its name would make the claim anyway.
   */
  it('renders nothing at all for a venue with no reviews', () => {
    const { container } = render(<StarRating rating={{ average: null, count: 0, isTopRated: false }} />);

    expect(container).toBeEmptyDOMElement();
  });
});
