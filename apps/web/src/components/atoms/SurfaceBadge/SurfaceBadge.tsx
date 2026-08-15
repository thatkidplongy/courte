import type { CourtSurface } from '@courte/contract';

import { COURT_SURFACE_LABELS } from '@/consts';
import { cn } from '@/lib/utils';

type SurfaceBadgeProps = {
  surface: CourtSurface;
  className?: string;
};

export const SurfaceBadge = ({ surface, className }: SurfaceBadgeProps) => (
  <span
    className={cn(
      'bg-background/95 text-ink rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em]',
      className
    )}
  >
    {COURT_SURFACE_LABELS[surface]}
  </span>
);
