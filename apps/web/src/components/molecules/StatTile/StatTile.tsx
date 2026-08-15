import { FieldLabel } from '@/components/atoms/FieldLabel';
import { cn } from '@/lib/utils';

type StatTileProps = {
  value: string;
  label: string;
  className?: string;
};

/**
 * Flush left, value first, in a `<dl>` where the parent draws the rules between cells.
 *
 * The DOM order is `<dt>` then `<dd>` because a description list requires it; `flex-col-reverse`
 * puts the figure on top without breaking the pairing for anything reading the markup.
 */
export const StatTile = ({ value, label, className }: StatTileProps) => (
  <div className={cn('flex flex-col-reverse gap-2', className)}>
    <dt>
      <FieldLabel>{label}</FieldLabel>
    </dt>
    <dd className="text-brand-700 text-3xl font-extrabold leading-none tracking-tight">{value}</dd>
  </div>
);
