import type { Sport } from '@courte/contract';

import { SPORT_LABELS } from '@/consts';
import { cn } from '@/lib/utils';

type SportBadgeProps = {
  sport: Sport;
  className?: string;
};

/**
 * A dot and a word on the card's meta line, not a coloured banner label.
 *
 * The dot is the accent for every sport. The system is a mono scheme — it earns its structure
 * from rules and alignment, not from hue — so giving each sport its own colour would put six
 * competing accents on one results page and leave the primary action with nothing to stand
 * out against. The sport is named in words; it does not need to be named twice.
 */
export const SportBadge = ({ sport, className }: SportBadgeProps) => (
  <span className={cn('text-muted-foreground flex items-center gap-1.5 text-xs font-medium', className)}>
    <span className="bg-primary h-[7px] w-[7px] shrink-0 rounded-full" aria-hidden />
    {SPORT_LABELS[sport]}
  </span>
);
