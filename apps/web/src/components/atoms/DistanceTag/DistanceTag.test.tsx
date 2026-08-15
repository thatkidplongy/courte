import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DistanceTag } from './DistanceTag';

describe('DistanceTag', () => {
  it('renders sub-kilometre distances in metres', () => {
    render(<DistanceTag metres={640} />);

    expect(screen.getByText('640 m')).toBeInTheDocument();
  });

  it('renders longer distances in kilometres to one decimal', () => {
    render(<DistanceTag metres={2593} />);

    expect(screen.getByText('2.6 km')).toBeInTheDocument();
  });
});
