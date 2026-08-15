import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Pagination } from './Pagination';

const buildHref = (page: number) => `/courts?sport=tennis&page=${page}`;

describe('Pagination', () => {
  it('renders nothing when everything fits on one page', () => {
    const { container } = render(<Pagination page={1} totalPages={1} buildHref={buildHref} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('reports the position', () => {
    render(<Pagination page={2} totalPages={5} buildHref={buildHref} />);

    expect(screen.getByText('Page 2 of 5')).toBeInTheDocument();
  });

  /** The pager must carry filters forward, or "next" silently returns a different result set. */
  it('preserves the active filters in both step links', () => {
    render(<Pagination page={2} totalPages={5} buildHref={buildHref} />);

    expect(screen.getByRole('link', { name: '← Previous' })).toHaveAttribute('href', '/courts?sport=tennis&page=1');
    expect(screen.getByRole('link', { name: 'Next →' })).toHaveAttribute('href', '/courts?sport=tennis&page=3');
  });

  it('offers no previous link on the first page', () => {
    render(<Pagination page={1} totalPages={3} buildHref={buildHref} />);

    expect(screen.queryByRole('link', { name: '← Previous' })).not.toBeInTheDocument();
    expect(screen.getByText('← Previous')).toHaveAttribute('aria-disabled', 'true');
  });

  it('offers no next link on the last page', () => {
    render(<Pagination page={3} totalPages={3} buildHref={buildHref} />);

    expect(screen.queryByRole('link', { name: 'Next →' })).not.toBeInTheDocument();
    expect(screen.getByText('Next →')).toHaveAttribute('aria-disabled', 'true');
  });
});
