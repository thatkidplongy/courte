import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { VenueGallery } from './VenueGallery';

const photo = (n: number) => ({ url: `https://cdn.test/${n}.jpg`, alt: `Photo ${n}` });

describe('VenueGallery', () => {
  it('shows the glyph and no strip when the venue has no photos', () => {
    const { container } = render(<VenueGallery photos={[]} sport="futsal" />);

    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('ul')).toBeNull();
  });

  it('shows a lone photo as the banner with no strip beneath it', () => {
    const { container } = render(<VenueGallery photos={[photo(1)]} sport="tennis" />);

    expect(screen.getByAltText('Photo 1')).toBeInTheDocument();
    expect(container.querySelector('ul')).toBeNull();
  });

  /** The first photo is the banner; the API's order is the venue's chosen order. */
  it('puts the rest in a strip below the first', () => {
    render(<VenueGallery photos={[photo(1), photo(2), photo(3)]} sport="tennis" />);

    expect(screen.getByAltText('Photo 1')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });
});
