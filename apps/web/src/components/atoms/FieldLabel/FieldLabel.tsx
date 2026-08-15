import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type FieldLabelProps = {
  children: ReactNode;
  className?: string;
};

/**
 * The micro-caps caption. It does a lot of work in this design — above controls, above stats,
 * over table sections — and its proportions (10px, 600, wide tracking) are what make it read
 * as a label rather than as small copy, so they are set once here.
 *
 * Text only: the `<label>` element is FormField's job.
 */
export const FieldLabel = ({ children, className }: FieldLabelProps) => (
  <span className={cn('text-muted-foreground text-[10px] font-semibold uppercase tracking-[0.12em]', className)}>
    {children}
  </span>
);
