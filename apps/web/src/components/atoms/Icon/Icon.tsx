/**
 * Inline icon set drawn to the design system's spec: 24-unit box, no fill, `currentColor`
 * stroke, so an icon takes its colour from the parent's text class and its size from the
 * caller. Lucide's geometry where an equivalent exists — matching what the mockups drew.
 */

type IconProps = {
  className?: string;
};

const BASE = 'inline-block shrink-0';

type GlyphProps = IconProps & {
  children: React.ReactNode;
  strokeWidth?: number;
};

const Glyph = ({ className = 'h-4 w-4', strokeWidth = 2, children }: GlyphProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`${BASE} ${className}`}
    aria-hidden
  >
    {children}
  </svg>
);

export const ClockIcon = (props: IconProps) => (
  <Glyph {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Glyph>
);

export const CheckIcon = (props: IconProps) => (
  <Glyph strokeWidth={2.4} {...props}>
    <path d="M20 6L9 17l-5-5" />
  </Glyph>
);

/** Lucide's `ban`: the universal "not available", and the only cell state a word would waste. */
export const UnavailableIcon = (props: IconProps) => (
  <Glyph {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M5.6 5.6l12.8 12.8" />
  </Glyph>
);

/** Lucide's `more-horizontal`: the tile that stands for "and the rest", never for a thing. */
export const EllipsisIcon = (props: IconProps) => (
  <Glyph {...props}>
    <circle cx="5" cy="12" r="1.4" />
    <circle cx="12" cy="12" r="1.4" />
    <circle cx="19" cy="12" r="1.4" />
  </Glyph>
);

export const PinIcon = (props: IconProps) => (
  <Glyph {...props}>
    <path d="M12 21s-7-5.5-7-11a7 7 0 1 1 14 0c0 5.5-7 11-7 11z" />
    <circle cx="12" cy="10" r="2.5" />
  </Glyph>
);

export const ShieldIcon = (props: IconProps) => (
  <Glyph {...props}>
    <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
  </Glyph>
);

export const BoltIcon = (props: IconProps) => (
  <Glyph {...props}>
    <path d="M13 3L5 13h6l-1 8 8-10h-6l1-8z" />
  </Glyph>
);

export const SearchIcon = (props: IconProps) => (
  <Glyph strokeWidth={2.2} {...props}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-4-4" />
  </Glyph>
);

export const ArrowRightIcon = (props: IconProps) => (
  <Glyph strokeWidth={2.4} {...props}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Glyph>
);

export const CalendarIcon = (props: IconProps) => (
  <Glyph {...props}>
    <rect x="3" y="5" width="18" height="16" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </Glyph>
);

export const HomeIcon = (props: IconProps) => (
  <Glyph {...props}>
    <path d="M4 11l8-7 8 7v9H4z" />
  </Glyph>
);

export const UsersIcon = (props: IconProps) => (
  <Glyph {...props}>
    <circle cx="9" cy="8" r="3" />
    <circle cx="17" cy="9" r="2.4" />
    <path d="M3 19c0-3 2.7-5 6-5s6 2 6 5M15 19c0-2 1-3.4 3-3.4S21 17 21 19" />
  </Glyph>
);

export const PhoneIcon = (props: IconProps) => (
  <Glyph {...props}>
    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a1 1 0 01-1 1A15 15 0 014 5a1 1 0 011-1z" />
  </Glyph>
);

export const GlobeIcon = (props: IconProps) => (
  <Glyph {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.5 2.6 2.5 15 0 18M12 3c-2.5 2.6-2.5 15 0 18" />
  </Glyph>
);

/**
 * The brand mark: a court seen from above, reduced to its boundary and its two centre lines.
 * The lines are held back to 45% so the ring reads first at 20px, where it usually sits.
 */
export const CourtMark = ({ className = 'h-5 w-5' }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className={`${BASE} ${className}`}
    aria-hidden
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M12 3v18M3 12h18" strokeOpacity="0.45" />
  </svg>
);
