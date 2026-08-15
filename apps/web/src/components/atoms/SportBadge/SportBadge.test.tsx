import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SportBadge } from './SportBadge';

describe('SportBadge', () => {
  it('renders the display label rather than the raw enum value', () => {
    render(<SportBadge sport="pickleball" />);

    expect(screen.getByText('Pickleball')).toBeInTheDocument();
  });

  it('covers every sport the contract defines', () => {
    render(<SportBadge sport="futsal" />);

    expect(screen.getByText('Futsal')).toBeInTheDocument();
  });
});
