import type { ReactNode } from 'react';

import { FieldLabel } from '@/components/atoms/FieldLabel';
import { cn } from '@/lib/utils';

type ControlGroupProps = {
  label: string;
  children: ReactNode;
  className?: string;
};

/**
 * A micro-caps caption above a control — deliberately not FormField.
 *
 * FormField wraps its child in a `<label>`, which is right for an `<input>` and wrong for
 * everything shadcn builds on Base UI: a Select is a button opening a listbox, and a `<label>`
 * around it associates the caption with no form element at all. This renders the caption as
 * plain text beside the control instead, which is what a listbox's own labelling expects.
 */
export const ControlGroup = ({ label, children, className }: ControlGroupProps) => (
  <div className={cn('flex flex-col gap-1.5', className)}>
    <FieldLabel>{label}</FieldLabel>
    {children}
  </div>
);
