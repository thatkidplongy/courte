import { cn } from '@/lib/utils';

/**
 * The mockup's badge, now that there is data behind it. Derived server-side from the thresholds
 * in the contract — a venue earns it at 4.8 across at least ten reviews — so this component
 * only draws what it is told and cannot invent the claim.
 *
 * The one green thing on a result row, which is why the row's other accents stay ink.
 */
export const TopRatedBadge = ({ className }: { className?: string }) => (
  <span
    className={cn(
      'bg-primary rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-white',
      className
    )}
  >
    Top rated
  </span>
);
