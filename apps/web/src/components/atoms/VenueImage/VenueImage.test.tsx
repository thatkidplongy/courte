import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { VenueImage } from './VenueImage';

describe('VenueImage', () => {
  it('renders the photo with its own alternative text', () => {
    render(<VenueImage photo={{ url: 'https://cdn.test/hall.jpg', alt: 'The main hall' }} sport="badminton" />);

    const image = screen.getByAltText('The main hall');
    expect(image).toHaveAttribute('src', 'https://cdn.test/hall.jpg');
  });

  /**
   * The common case for a while yet: the table exists, the photos do not. The fallback still
   * names the sport, because in the card banner nothing else does.
   */
  it('falls back to the sport glyph when there is no photo', () => {
    const { container } = render(<VenueImage photo={null} sport="tennis" />);

    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByRole('img', { name: 'Tennis' })).toBeInTheDocument();
  });
});
