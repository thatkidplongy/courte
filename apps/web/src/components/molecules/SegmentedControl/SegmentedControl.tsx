import Link from 'next/link';

import { cn } from '@/lib/utils';

export type Segment = {
  value: string;
  label: string;
  href: string;
};

type SegmentedControlProps = {
  /** Names the group for assistive tech — "Sort", "Booking period". */
  label: string;
  segments: Segment[];
  value: string;
  /** Spreads the segments evenly across the full width, as the phone screens do. */
  isFullWidth?: boolean;
  className?: string;
};

/**
 * Links, not buttons. Each option is a real URL the reader can bookmark, share or open in a new
 * tab, and the page is server-rendered from that URL — turning it into client state would give
 * up all of that to save a navigation.
 *
 * `aria-current` rather than `aria-pressed`: these are navigation targets, one of which is where
 * you already are.
 */
export const SegmentedControl = ({ label, segments, value, isFullWidth, className }: SegmentedControlProps) => (
  <nav
    aria-label={label}
    className={cn(
      'border-border divide-border divide-x overflow-hidden rounded-md border',
      isFullWidth ? 'flex' : 'inline-flex',
      className
    )}
  >
    {segments.map(segment => {
      const isActive = segment.value === value;

      return (
        <Link
          key={segment.value}
          href={segment.href}
          aria-current={isActive ? 'true' : undefined}
          className={cn(
            'px-3.5 py-2.5 text-xs font-semibold transition',
            isFullWidth && 'flex-1 text-center',
            isActive ? 'bg-ink text-white' : 'hover:bg-muted'
          )}
        >
          {segment.label}
        </Link>
      );
    })}
  </nav>
);
