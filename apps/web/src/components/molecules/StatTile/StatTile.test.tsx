import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StatTile } from './StatTile';

describe('StatTile', () => {
  it('pairs the value with its label as a definition', () => {
    render(
      <dl>
        <StatTile value="17" label="Courts to book" />
      </dl>
    );

    expect(screen.getByText('17').tagName).toBe('DD');
    expect(screen.getByText('Courts to book').closest('dt')).toBeInTheDocument();
  });
});
