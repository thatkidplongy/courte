import Link from 'next/link';

import { SPORTS } from '@courte/contract';

import { EllipsisIcon } from '@/components/atoms/Icon';
import { SportGlyph } from '@/components/atoms/SportGlyph';
import { SPORT_LABELS } from '@/consts';
import { cn } from '@/lib/utils';

const TILE_CLASSES = 'flex w-[120px] flex-col gap-3.5 rounded-md border px-4 py-5 transition lg:w-auto';

/**
 * A scrolling row on a phone and a seven-across grid on a desktop. The phone screens in the
 * design put sports in a swipeable strip rather than a grid, and a 2×3 grid of tiles is a lot
 * of vertical space to spend before the reader has seen a single court.
 *
 * The seventh tile is the mockup's "More", drawn dashed because it names no sport. Ours leads
 * to the unfiltered marketplace rather than nowhere: every sport we do not have a tile for is
 * reached by not filtering at all.
 */
export const SportTiles = ({ dateIso }: { dateIso: string }) => (
  <ul className="-mx-5 mt-7 flex snap-x gap-3.5 overflow-x-auto px-5 pb-1 lg:mx-0 lg:grid lg:grid-cols-7 lg:px-0">
    {SPORTS.map(sport => (
      <li key={sport} className="shrink-0 snap-start lg:shrink">
        <Link
          href={`/courts?sport=${sport}&date=${dateIso}`}
          className={cn(TILE_CLASSES, 'border-border hover:border-primary hover:bg-accent')}
        >
          <SportGlyph sport={sport} className="h-[26px] w-[26px]" />
          <span className="text-[13px] font-semibold">{SPORT_LABELS[sport]}</span>
        </Link>
      </li>
    ))}
    <li className="shrink-0 snap-start lg:shrink">
      <Link
        href={`/courts?date=${dateIso}`}
        className={cn(
          TILE_CLASSES,
          'border-muted-foreground/35 text-muted-foreground hover:border-primary border-dashed'
        )}
      >
        <EllipsisIcon className="h-[26px] w-[26px]" />
        <span className="text-[13px] font-semibold">More</span>
      </Link>
    </li>
  </ul>
);
