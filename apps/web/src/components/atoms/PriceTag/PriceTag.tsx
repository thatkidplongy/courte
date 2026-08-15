import { formatWholePesos } from '@/lib/format';
import { cn } from '@/lib/utils';

type PriceTagProps = {
  /** Cents, or null when the court has no rule a non-member can book. */
  cents: number | null;
  className?: string;
};

/**
 * Renders nothing at all for a null rate. A court with no public price rule cannot be quoted,
 * and showing "from ₱0" would be a price we are not offering — silence is the safe default.
 *
 * "from" stays even though the mockups show a bare figure: the number is the cheapest rule on
 * the court, not the price of any particular slot, and dropping the qualifier would promise a
 * precision the value does not have.
 */
export const PriceTag = ({ cents, className }: PriceTagProps) => {
  if (cents === null) return null;

  return (
    <p className={cn('flex items-baseline gap-1.5', className)}>
      <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-[0.12em]">from</span>
      <span className="text-xl font-extrabold leading-none tracking-tight">{formatWholePesos(cents)}</span>
      <span className="text-muted-foreground text-[11px] font-medium">/hr</span>
    </p>
  );
};
