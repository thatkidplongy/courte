import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Avatar, toInitials } from './Avatar';

describe('toInitials', () => {
  it('takes the first letter of the first two words', () => {
    expect(toInitials('Jaime Mendoza')).toBe('JM');
  });

  it('stops at two, however many names someone has', () => {
    expect(toInitials('Maria Cristina Santos Reyes')).toBe('MC');
  });

  it('handles a single word without inventing a second letter', () => {
    expect(toInitials('Courte')).toBe('C');
  });

  it('survives the stray double space', () => {
    expect(toInitials('  Rica   Villamor ')).toBe('RV');
  });
});

describe('Avatar', () => {
  it('keeps the full name reachable, since the disc only shows two letters', () => {
    render(<Avatar name="Jaime Mendoza" />);

    expect(screen.getByTitle('Jaime Mendoza')).toHaveTextContent('JM');
  });
});
