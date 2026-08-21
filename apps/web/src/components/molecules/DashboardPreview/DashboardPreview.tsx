import { FieldLabel } from '@/components/atoms/FieldLabel';
import { cn } from '@/lib/utils';

type DashboardPreviewProps = {
  className?: string;
};

/**
 * A picture of the owner's console, shown to somebody who cannot open it — the landing page's
 * one illustration of what a venue account is for.
 *
 * Its figures are invented, and the eyebrow says so. Every other number on this page is read
 * off the database, so the one place that cannot be has to admit it rather than borrow the
 * authority of the ones that can. The whole card is `aria-hidden`: a screen reader announcing
 * "126 bookings" would be reading a drawing aloud as though it were this venue's takings, and
 * the list of capabilities beside it already carries the meaning.
 */
type PreviewFigure = {
  value: string;
  label: string;
  /** The one figure the console itself colours — occupancy is what an owner is steering. */
  isAccent?: boolean;
};

const FIGURES: PreviewFigure[] = [
  { value: '126', label: 'Bookings' },
  { value: '₱84,250', label: 'Revenue' },
  { value: '76%', label: 'Occupancy', isAccent: true },
];

/** A fortnight that trends up, drawn once. Nothing reads these back, so they are just shape. */
const TREND_POINTS = '0,72 22,58 44,66 66,40 88,52 110,30 132,44 154,22 176,34 198,14 220,24';

export const DashboardPreview = ({ className }: DashboardPreviewProps) => (
  <div className={cn('border-border rounded-md border bg-white p-4', className)} aria-hidden>
    <FieldLabel>Dashboard, for illustration</FieldLabel>

    <dl className="mb-4 mt-3.5 flex gap-5">
      {FIGURES.map(figure => (
        <div key={figure.label}>
          <dd className={cn('text-[17px] font-extrabold leading-none', figure.isAccent && 'text-brand-700')}>
            {figure.value}
          </dd>
          <dt className="text-muted-foreground mt-1.5 text-[9.5px] font-medium">{figure.label}</dt>
        </div>
      ))}
    </dl>

    <svg viewBox="0 0 220 90" className="h-[90px] w-full" role="presentation">
      <polyline points={TREND_POINTS} className="text-primary" fill="none" stroke="currentColor" strokeWidth={2.4} />
      <line x1="0" y1="88" x2="220" y2="88" className="text-border" stroke="currentColor" strokeWidth={1} />
    </svg>
  </div>
);
