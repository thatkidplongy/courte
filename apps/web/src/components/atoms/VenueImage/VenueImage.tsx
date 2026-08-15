import type { Sport, VenuePhoto } from '@courte/contract';

import { SportGlyph } from '@/components/atoms/SportGlyph';
import { cn } from '@/lib/utils';

type VenueImageProps = {
  photo: VenuePhoto | null;
  /** Drives the fallback glyph, which is what most venues will show for a while yet. */
  sport: Sport;
  className?: string;
  glyphClassName?: string;
};

/**
 * A venue's picture, or the sport glyph standing in for one. Every surface that shows venue
 * imagery goes through here, so "what do we draw when there is no photo" is answered once.
 *
 * A plain `<img>` rather than `next/image`: the optimiser needs `remotePatterns` naming the
 * hosts photos come from, and that host is not chosen yet — there is no upload path. Swapping
 * this one element over is the whole migration once storage lands.
 */
export const VenueImage = ({ photo, sport, className, glyphClassName }: VenueImageProps) => {
  if (!photo) {
    return (
      <div className={cn('bg-accent flex items-center justify-center', className)}>
        <SportGlyph sport={sport} className={cn('text-primary/25', glyphClassName)} />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={photo.url} alt={photo.alt} loading="lazy" className={cn('h-full w-full object-cover', className)} />
  );
};
