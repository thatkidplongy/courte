import { PinIcon } from '@/components/atoms/Icon';
import { formatDistance } from '@/lib/format';
import { cn } from '@/lib/utils';

type DistanceTagProps = {
  metres: number;
  className?: string;
};

export const DistanceTag = ({ metres, className }: DistanceTagProps) => (
  <span className={cn('text-muted-foreground flex shrink-0 items-center gap-1 text-xs font-medium', className)}>
    <PinIcon className="h-3.5 w-3.5" />
    {formatDistance(metres)}
  </span>
);
