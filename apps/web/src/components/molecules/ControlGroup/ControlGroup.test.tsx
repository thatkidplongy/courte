import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ControlGroup } from './ControlGroup';

describe('ControlGroup', () => {
  it('shows the caption beside its control', () => {
    render(
      <ControlGroup label="Sport">
        <button type="button">Pickleball</button>
      </ControlGroup>
    );

    expect(screen.getByText('Sport')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pickleball' })).toBeInTheDocument();
  });

  it('does not wrap the control in a label, which is the whole reason it is not FormField', () => {
    render(
      <ControlGroup label="Sport">
        <button type="button">Pickleball</button>
      </ControlGroup>
    );

    expect(screen.getByRole('button').closest('label')).toBeNull();
  });
});
