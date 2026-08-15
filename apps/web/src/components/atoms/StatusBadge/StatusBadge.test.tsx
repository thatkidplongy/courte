import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StatusBadge, type BadgeTone } from './StatusBadge';

const TONES: BadgeTone[] = ['positive', 'warning', 'neutral', 'negative'];

describe('StatusBadge', () => {
  it('shows its label', () => {
    render(<StatusBadge tone="positive">Confirmed</StatusBadge>);

    expect(screen.getByText('Confirmed')).toBeInTheDocument();
  });

  it('gives each tone a different fill, so the four are distinguishable without reading', () => {
    const classNames = TONES.map(tone => {
      const { container, unmount } = render(<StatusBadge tone={tone}>Label</StatusBadge>);
      const className = container.firstElementChild?.className ?? '';
      unmount();
      return className;
    });

    expect(new Set(classNames).size).toBe(TONES.length);
  });
});
