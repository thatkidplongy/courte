import type { Trend } from '@courte/contract';

import { cn } from '@/lib/utils';

type TrendTagProps = {
  trend: Trend;
  className?: string;
};

const ARROWS: Record<Trend['direction'], string> = { up: '↑', down: '↓', flat: '→' };

/**
 * A figure's movement against the window before it.
 *
 * The null percentage is the case worth writing carefully: growth from a zero baseline is not
 * "∞%" or "+100%", it is "up from nothing", and saying that in words is the only honest
 * rendering of it.
 *
 * Nothing is rendered when both windows are zero — "no change" against nothing that ever
 * happened is noise, and a dashboard on its first day would otherwise carry three of them.
 *
 * Deliberately not coloured green and red: this component does not know whether the figure it
 * decorates is one where up is good.
 */
export const TrendTag = ({ trend, className }: TrendTagProps) => {
  if (trend.current === 0 && trend.previous === 0) return null;

  const label =
    trend.changePercent === null
      ? 'up from nothing'
      : trend.changePercent === 0
        ? 'no change'
        : `${Math.abs(trend.changePercent)}%`;

  return (
    <span className={cn('text-muted-foreground flex items-center gap-1 text-[11.5px] font-semibold', className)}>
      <span aria-hidden>{ARROWS[trend.direction]}</span>
      {label}
      <span className="font-medium">vs previous</span>
    </span>
  );
};
