import Link from 'next/link';

import { formatTime } from '@/lib/format';
import { cn } from '@/lib/utils';

type SlotChipListProps = {
  courtId: number;
  dateIso: string;
  startIsos: string[];
  venueTimezone: string;
  className?: string;
};

/**
 * "No times left" rather than "fully booked" — an empty list may mean the court is taken or
 * that the venue has closed for the evening, and the card cannot tell the two apart. Claiming
 * it is booked out when it is merely shut is a statement the data does not support.
 */
const NoTimesLeft = () => <span className="text-muted-foreground text-xs font-medium">No times left</span>;

export const SlotChipList = ({ courtId, dateIso, startIsos, venueTimezone, className }: SlotChipListProps) => {
  if (startIsos.length === 0) return <NoTimesLeft />;

  return (
    <>
      {startIsos.map(startIso => (
        <Link
          key={startIso}
          href={`/courts/${courtId}?date=${dateIso}&start=${encodeURIComponent(startIso)}`}
          className={cn(
            'border-border hover:border-primary hover:bg-accent hover:text-accent-foreground',
            'inline-flex items-center rounded-md border px-3 py-1.5 text-[11px] font-semibold transition',
            className
          )}
        >
          {formatTime(new Date(startIso), venueTimezone)}
        </Link>
      ))}
    </>
  );
};
