import type { ReactNode } from 'react';

import { PinIcon } from '@/components/atoms/Icon';
import { PAGE_GUTTER } from '@/consts';
import { cn } from '@/lib/utils';

type ListingLayoutProps = {
  title: string;
  tagline: string;
  /** The filter bar, floated over the seam between the night band and the body. */
  filters: ReactNode;
  children: ReactNode;
};

/**
 * Night band, floating filter bar, results below. The overlap is why this is a template rather
 * than page markup: the band's bottom padding and the bar's negative margin have to agree, and
 * that pairing should be defined once.
 */
export const ListingLayout = ({ title, tagline, filters, children }: ListingLayoutProps) => (
  <main className="pb-20">
    <section className="bg-night text-white">
      <div className={cn(PAGE_GUTTER, 'pb-24 pt-14')}>
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-[42px]">{title}</h1>
        <p className="text-primary mt-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em]">
          <PinIcon className="h-3.5 w-3.5" />
          {tagline}
        </p>
      </div>
    </section>

    {/* `relative` is load-bearing: the band's content sits in a positioned box, so a static
        sibling pulled up by the negative margin would slide underneath it. */}
    <div className={cn(PAGE_GUTTER, 'relative z-10 -mt-16')}>{filters}</div>
    <div className={cn(PAGE_GUTTER, 'pt-10')}>{children}</div>
  </main>
);
