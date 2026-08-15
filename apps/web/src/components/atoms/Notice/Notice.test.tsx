import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Notice } from './Notice';

describe('Notice', () => {
  it('announces an error, because it appears in response to a submit', () => {
    render(<Notice tone="error">Slot already taken</Notice>);

    expect(screen.getByRole('alert')).toHaveTextContent('Slot already taken');
  });

  it('does not announce a success or an aside', () => {
    render(<Notice tone="success">Done.</Notice>);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('Done.')).toBeInTheDocument();
  });
});
