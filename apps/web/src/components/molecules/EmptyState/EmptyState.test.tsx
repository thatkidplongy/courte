import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('explains what happened and what to try', () => {
    render(<EmptyState title="Nothing matches those filters" description="Try widening the price." />);

    expect(screen.getByText('Nothing matches those filters')).toBeInTheDocument();
    expect(screen.getByText('Try widening the price.')).toBeInTheDocument();
  });

  it('offers a way out when one is given', () => {
    render(
      <EmptyState
        title="Nothing matches"
        description="Try again."
        action={{ href: '/courts', label: 'Show every court' }}
      />
    );

    expect(screen.getByRole('link', { name: 'Show every court' })).toHaveAttribute('href', '/courts');
  });

  it('renders no link when there is no action', () => {
    render(<EmptyState title="Nothing matches" description="Try again." />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
