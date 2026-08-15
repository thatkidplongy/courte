import type { ReactNode } from 'react';

import { FieldLabel } from '@/components/atoms/FieldLabel';
import { cn } from '@/lib/utils';

type PageHeaderProps = {
  /** The micro-caps line above the title — a date, a section name, a status. */
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** Actions, pushed to the right on wide screens. */
  actions?: ReactNode;
  className?: string;
};

/**
 * Title block above a 2px rule. The rule is the design's main structural move, and putting it
 * here means every page gets it at the same weight and the same distance from the heading.
 */
export const PageHeader = ({ eyebrow, title, subtitle, actions, className }: PageHeaderProps) => (
  <div className={cn('border-ink flex flex-wrap items-end justify-between gap-4 border-b-2 pb-5', className)}>
    <div>
      {eyebrow ? <FieldLabel className="text-primary">{eyebrow}</FieldLabel> : null}
      <h1 className={cn('text-3xl font-extrabold tracking-tight', eyebrow && 'mt-2')}>{title}</h1>
      {subtitle ? <p className="text-muted-foreground mt-2 text-[13px] font-medium">{subtitle}</p> : null}
    </div>
    {actions ? <div className="flex items-center gap-2.5">{actions}</div> : null}
  </div>
);
