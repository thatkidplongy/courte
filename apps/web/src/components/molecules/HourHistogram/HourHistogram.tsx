import { formatHourLabel } from '@/lib/format';
import { cn } from '@/lib/utils';

export type HourBar = {
  hour: number;
  bookings: number;
};

type HourHistogramProps = {
  bars: HourBar[];
  className?: string;
};

/** Above this share of the busiest hour, a bar reads as peak and takes the accent. */
const PEAK_SHARE = 0.6;
const WARM_SHARE = 0.3;

/**
 * Never fewer columns than this. A venue with bookings in a single hour would otherwise render
 * one bar stretched across the full width, which reads as "booked solid all day" — the exact
 * opposite of what one booking means.
 */
const MIN_COLUMNS = 8;

/**
 * Widens a narrow active range to `MIN_COLUMNS`, centred, clamped to the day. Returns an
 * inclusive [start, end] pair of hour indices.
 */
const resolveVisibleRange = (first: number, last: number, hoursInDay: number): [number, number] => {
  const span = last - first + 1;
  if (span >= MIN_COLUMNS) return [first, last];

  const padded = Math.max(0, first - Math.floor((MIN_COLUMNS - span) / 2));
  const end = Math.min(hoursInDay - 1, padded + MIN_COLUMNS - 1);
  return [Math.max(0, end - MIN_COLUMNS + 1), end];
};

const toToneClass = (share: number): string => {
  if (share >= PEAK_SHARE) return 'bg-primary';
  if (share >= WARM_SHARE) return 'bg-brand-200';
  return 'bg-border';
};

/**
 * Demand by hour of day, drawn with divs rather than a chart library — it is one series of
 * twenty-four values with no axes to speak of, and a charting dependency would be more code
 * than the chart.
 *
 * Hours with no bookings at all are dropped from the ends so the venue's actual trading day
 * fills the width, rather than being squeezed into the middle by a row of empty small hours.
 */
export const HourHistogram = ({ bars, className }: HourHistogramProps) => {
  const firstActive = bars.findIndex(bar => bar.bookings > 0);
  const lastActive = bars.map(bar => bar.bookings > 0).lastIndexOf(true);

  if (firstActive === -1) {
    return <p className={cn('text-muted-foreground py-6 text-sm', className)}>No bookings in the last 30 days.</p>;
  }

  const [from, to] = resolveVisibleRange(firstActive, lastActive, bars.length);
  const visible = bars.slice(from, to + 1);
  const busiest = Math.max(...visible.map(bar => bar.bookings));

  return (
    <div className={className}>
      <div className="flex h-[150px] items-end gap-1.5">
        {visible.map(bar => {
          const share = busiest === 0 ? 0 : bar.bookings / busiest;

          return (
            <div
              key={bar.hour}
              title={`${formatHourLabel(bar.hour)} — ${bar.bookings} ${bar.bookings === 1 ? 'booking' : 'bookings'}`}
              className={cn('flex-1 rounded-t-[3px]', toToneClass(share))}
              // Percentage heights are the point of the chart, so they are data, not styling.
              style={{ height: `${Math.max(share * 100, 3)}%` }}
            />
          );
        })}
      </div>
      <div className="text-muted-foreground mt-2.5 flex justify-between text-[10.5px] font-medium">
        <span>{formatHourLabel(visible[0]?.hour ?? 0)}</span>
        <span>{formatHourLabel(visible[visible.length - 1]?.hour ?? 0)}</span>
      </div>
    </div>
  );
};
