import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SPORTS } from '@courte/contract';

import { SportGlyph } from './SportGlyph';

describe('SportGlyph', () => {
  it('names the sport, so the card banner is not a silent decoration', () => {
    render(<SportGlyph sport="badminton" />);

    expect(screen.getByRole('img', { name: 'Badminton' })).toBeInTheDocument();
  });

  it('draws every sport the contract allows', () => {
    SPORTS.forEach(sport => {
      const { container, unmount } = render(<SportGlyph sport={sport} />);
      expect(container.querySelector('svg')?.children.length).toBeGreaterThan(0);
      unmount();
    });
  });
});
