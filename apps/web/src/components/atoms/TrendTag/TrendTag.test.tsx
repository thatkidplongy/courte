import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TrendTag } from './TrendTag';

describe('TrendTag', () => {
  it('shows the magnitude without repeating the sign the arrow already carries', () => {
    render(<TrendTag trend={{ current: 120, previous: 100, changePercent: 20, direction: 'up' }} />);

    expect(screen.getByText('20%')).toBeInTheDocument();
  });

  it('states a fall as a positive magnitude beside a down arrow', () => {
    render(<TrendTag trend={{ current: 75, previous: 100, changePercent: -25, direction: 'down' }} />);

    expect(screen.getByText('25%')).toBeInTheDocument();
  });

  /** The case that renders as "∞%" if a null percentage is formatted like a number. */
  it('says "up from nothing" rather than inventing a percentage', () => {
    render(<TrendTag trend={{ current: 40, previous: 0, changePercent: null, direction: 'up' }} />);

    expect(screen.getByText('up from nothing')).toBeInTheDocument();
  });

  it('renders nothing when both windows are empty', () => {
    const { container } = render(<TrendTag trend={{ current: 0, previous: 0, changePercent: 0, direction: 'flat' }} />);

    expect(container).toBeEmptyDOMElement();
  });
});
