import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type PanelProps = {
  title?: string;
  description?: string;
  /** Rendered flush right of the title — a count, a status, a secondary action. */
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
};

/**
 * A bordered region. The design system draws surfaces with a 1px rule and nothing else — no
 * shadow, no tinted fill — so this is deliberately thin: the border, the radius and the
 * padding, defined once so the app has one surface rather than a dozen near-identical ones.
 */
export const Panel = ({ title, description, aside, children, className }: PanelProps) => {
  const hasHeader = Boolean(title || description || aside);

  return (
    <section className={cn('border-border rounded-md border p-6', className)}>
      {hasHeader ? (
        <header className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            {title ? <h2 className="text-lg font-extrabold tracking-tight">{title}</h2> : null}
            {description ? <p className="text-muted-foreground mt-1.5 text-sm">{description}</p> : null}
          </div>
          {aside}
        </header>
      ) : null}
      <div className={cn(hasHeader && 'mt-5')}>{children}</div>
    </section>
  );
};
