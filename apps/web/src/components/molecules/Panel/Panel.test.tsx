import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Panel } from './Panel';

describe('Panel', () => {
  it('gives the title a heading role so the page outline is real', () => {
    render(
      <Panel title="Next 24 hours">
        <p>Body</p>
      </Panel>
    );

    expect(screen.getByRole('heading', { name: 'Next 24 hours' })).toBeInTheDocument();
  });

  it('renders no header at all when it is given only children', () => {
    render(
      <Panel>
        <p>Body</p>
      </Panel>
    );

    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
  });
});
