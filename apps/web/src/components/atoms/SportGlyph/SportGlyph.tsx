import type { Sport } from '@courte/contract';

import { SPORT_LABELS } from '@/consts';

type SportGlyphProps = {
  sport: Sport;
  className?: string;
};

/**
 * One line drawing per sport, taken from the design mockups. Secondary strokes are held at
 * 40–50% opacity so the silhouette carries at 26px and the seams only appear at larger sizes.
 *
 * Titled rather than `aria-hidden`: these appear on the landing's sport tiles alongside the
 * sport's name, and in the card banner where nothing else names the sport.
 */
const PATHS: Record<Sport, React.ReactNode> = {
  pickleball: (
    <>
      <circle cx="10" cy="9" r="6" />
      <path d="M13 14l6 7" />
    </>
  ),
  badminton: (
    <>
      <path d="M9 15l-6 6" />
      <circle cx="14" cy="10" r="5" />
      <path d="M14 5v10M9 10h10" strokeOpacity="0.4" />
    </>
  ),
  basketball: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3v18M5 6c4 3 4 9 0 12M19 6c-4 3-4 9 0 12" strokeOpacity="0.5" />
    </>
  ),
  volleyball: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3c3 5 3 13 0 18M4 8c5 2 11 2 16 0M4 16c5-2 11-2 16 0" strokeOpacity="0.5" />
    </>
  ),
  tennis: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M5 5c3 4 3 10 0 14M19 5c-3 4-3 10 0 14" strokeOpacity="0.5" />
    </>
  ),
  futsal: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7l4 3-1.5 5h-5L8 10z" />
    </>
  ),
};

export const SportGlyph = ({ sport, className = 'h-6 w-6' }: SportGlyphProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`inline-block shrink-0 ${className}`}
    role="img"
    aria-label={SPORT_LABELS[sport]}
  >
    {PATHS[sport]}
  </svg>
);
