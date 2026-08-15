import type { ReactNode } from 'react';

import { FieldLabel } from '@/components/atoms/FieldLabel';
import { cn } from '@/lib/utils';

type FormFieldProps = {
  label: ReactNode;
  children: ReactNode;
  /** Server-side field error. Rendered with `role="alert"` so it is announced, not just shown. */
  error?: string;
  className?: string;
};

/**
 * Label, control and error travel together as one unit. Wrapping the control in the `<label>`
 * gives the association without needing a generated id on every field.
 */
export const FormField = ({ label, children, error, className }: FormFieldProps) => (
  <label className={cn('flex flex-col gap-1', className)}>
    <FieldLabel>{label}</FieldLabel>
    {children}
    {error ? (
      <span role="alert" className="text-destructive text-xs font-medium">
        {error}
      </span>
    ) : null}
  </label>
);
