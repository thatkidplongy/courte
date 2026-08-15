import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Input } from '@/components/shadcn/ui/input';

import { FormField } from './FormField';

describe('FormField', () => {
  it('associates the label with its control', () => {
    render(
      <FormField label="Customer">
        <Input name="customerName" />
      </FormField>
    );

    expect(screen.getByLabelText('Customer')).toHaveAttribute('name', 'customerName');
  });

  it('announces a field error rather than only showing it', () => {
    render(
      <FormField label="Customer" error="Enter a name">
        <Input name="customerName" />
      </FormField>
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Enter a name');
  });

  it('renders no alert when there is no error', () => {
    render(
      <FormField label="Customer">
        <Input name="customerName" />
      </FormField>
    );

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
