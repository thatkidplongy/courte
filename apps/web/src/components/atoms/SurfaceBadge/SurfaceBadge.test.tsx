import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SurfaceBadge } from './SurfaceBadge';

describe('SurfaceBadge', () => {
  it('names an indoor court', () => {
    render(<SurfaceBadge surface="indoor" />);
    expect(screen.getByText('Indoor')).toBeInTheDocument();
  });

  it('names an outdoor court', () => {
    render(<SurfaceBadge surface="outdoor" />);
    expect(screen.getByText('Outdoor')).toBeInTheDocument();
  });

  /**
   * The case a boolean could not carry. Covered must read as its own thing rather than
   * collapsing into either neighbour — it is the difference between playing and going home
   * when it rains.
   */
  it('names a covered court distinctly from indoor and outdoor', () => {
    render(<SurfaceBadge surface="covered" />);
    expect(screen.getByText('Covered')).toBeInTheDocument();
    expect(screen.queryByText('Indoor')).not.toBeInTheDocument();
    expect(screen.queryByText('Outdoor')).not.toBeInTheDocument();
  });
});
