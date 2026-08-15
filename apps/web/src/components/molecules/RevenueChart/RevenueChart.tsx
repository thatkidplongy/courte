import { DateTime } from 'luxon';

import { formatWholePesos } from '@/lib/format';
import { cn } from '@/lib/utils';

export type RevenueDay = {
  date: string;
  collectedCents: number;
};

type RevenueChartProps = {
  days: RevenueDay[];
  className?: string;
};

/**
 * Money taken per day, drawn with divs for the same reason `HourHistogram` is: one series, no
 * axes worth the name, and a charting dependency would be more code than the chart.
 *
 * Unlike the histogram, no days are trimmed from the ends. A quiet stretch is the fact the
 * owner is looking for — dropping it would redraw a bad fortnight as a short good one.
 *
 * Refunds can make a day negative. Those are drawn at the floor rather than inverted: a bar
 * hanging below an axis needs an axis to hang below, and one refunded booking is not worth the
 * machinery. The total underneath still carries the sign.
 */
export const RevenueChart = ({ days, className }: RevenueChartProps) => {
  const best = Math.max(...days.map(day => day.collectedCents), 0);
  const total = days.reduce((sum, day) => sum + day.collectedCents, 0);

  if (best <= 0) {
    return (
      <p className={cn('text-muted-foreground py-6 text-sm', className)}>
        Nothing collected in this period. Payments recorded at the desk appear here.
      </p>
    );
  }

  const label = (day: RevenueDay): string => DateTime.fromISO(day.date).toFormat('d LLL');

  return (
    <div className={className}>
      <div className="flex h-[150px] items-end gap-[3px]">
        {days.map(day => {
          const share = day.collectedCents <= 0 ? 0 : day.collectedCents / best;

          return (
            <div
              key={day.date}
              title={`${label(day)} — ${formatWholePesos(day.collectedCents)}`}
              className={cn('flex-1 rounded-t-[2px]', day.collectedCents > 0 ? 'bg-primary' : 'bg-border')}
              style={{ height: `${Math.max(share * 100, 2)}%` }}
            />
          );
        })}
      </div>

      <div className="text-muted-foreground mt-2.5 flex justify-between text-[10.5px] font-medium">
        <span>{days[0] ? label(days[0]) : ''}</span>
        <span className="text-ink font-bold">{formatWholePesos(total)} collected</span>
        <span>{days[days.length - 1] ? label(days[days.length - 1]!) : ''}</span>
      </div>
    </div>
  );
};
