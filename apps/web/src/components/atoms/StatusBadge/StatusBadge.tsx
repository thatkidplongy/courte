import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type BadgeTone = 'positive' | 'warning' | 'neutral' | 'negative';

type StatusBadgeProps = {
  tone: BadgeTone;
  children: ReactNode;
  className?: string;
};

const TONE_CLASSES: Record<BadgeTone, string> = {
  positive: 'bg-accent text-accent-foreground',
  warning: 'bg-warn-50 text-warn-700',
  neutral: 'bg-muted text-muted-foreground',
  negative: 'bg-destructive/10 text-destructive',
};

/**
 * Four tones, not one per status. Booking status, payment state and waitlist state all needed
 * a badge and each was growing its own colour table; collapsing them onto what the reader has
 * to know — settled, in progress, inert, wrong — is what keeps the palette from sprawling.
 */
export const StatusBadge = ({ tone, children, className }: StatusBadgeProps) => (
  <span
    className={cn(
      'rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em]',
      TONE_CLASSES[tone],
      className
    )}
  >
    {children}
  </span>
);
