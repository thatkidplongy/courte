/**
 * Decorative hero artwork: a court seen from above with equipment arranged around it, taking
 * the flat-lay idea of ringing an open centre and shifting the weight right so the headline
 * keeps the left half to itself.
 *
 * Vector rather than a photograph, for three reasons that all bite in production: it is sharp
 * at any density with no 2x asset to ship, it is a couple of kilobytes against a few hundred,
 * and it is ours — no stock licence attached to the first thing every visitor sees.
 *
 * Every stroke is `currentColor`, so the colour comes from the parent's text class and follows
 * the palette rather than hard-coding a green. Hidden below `md`, where the artwork would sit
 * under the headline instead of beside it.
 */
export const HeroBackdrop = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 1440 600"
    preserveAspectRatio="xMaxYMid slice"
    className="text-brand-400 pointer-events-none absolute inset-0 hidden h-full w-full md:block"
  >
    {/* The court: outer boundary, inner tramlines, net across the middle with its posts. */}
    <g transform="translate(1080 300) rotate(-16)" opacity="0.22">
      <rect x="-280" y="-170" width="560" height="340" rx="4" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <rect x="-280" y="-118" width="560" height="236" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <line x1="-140" y1="-170" x2="-140" y2="170" stroke="currentColor" strokeWidth="1.5" />
      <line x1="140" y1="-170" x2="140" y2="170" stroke="currentColor" strokeWidth="1.5" />
      <line x1="-140" y1="0" x2="140" y2="0" stroke="currentColor" strokeWidth="1.5" />
      <line x1="0" y1="-192" x2="0" y2="192" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="0" cy="-192" r="5" fill="currentColor" />
      <circle cx="0" cy="192" r="5" fill="currentColor" />
    </g>

    {/* Shuttlecock: cork dome, flared skirt, a couple of feather ribs. */}
    <g transform="translate(818 122) rotate(18)" opacity="0.45">
      <path d="M -13 0 A 13 13 0 0 1 13 0 Z" fill="currentColor" />
      <path d="M -13 0 L -27 52 L 27 52 L 13 0 Z" fill="none" stroke="currentColor" strokeWidth="2" />
      <line x1="-4.5" y1="0" x2="-9" y2="52" stroke="currentColor" strokeWidth="1.5" />
      <line x1="4.5" y1="0" x2="9" y2="52" stroke="currentColor" strokeWidth="1.5" />
      <line x1="-20" y1="26" x2="20" y2="26" stroke="currentColor" strokeWidth="1.5" />
    </g>

    {/* Basketball. */}
    <g transform="translate(836 470)" opacity="0.32">
      <circle r="46" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <line x1="-46" y1="0" x2="46" y2="0" stroke="currentColor" strokeWidth="2" />
      <line x1="0" y1="-46" x2="0" y2="46" stroke="currentColor" strokeWidth="2" />
      <path d="M -30 -35 Q 0 0 -30 35" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M 30 -35 Q 0 0 30 35" fill="none" stroke="currentColor" strokeWidth="2" />
    </g>

    {/* Tennis ball, seams and all. */}
    <g transform="translate(1338 98)" opacity="0.3">
      <circle r="26" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <path d="M -24 -10 Q 0 6 24 -10" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M -24 10 Q 0 -6 24 10" fill="none" stroke="currentColor" strokeWidth="2" />
    </g>

    {/* Racket: head, strung face, throat and grip. */}
    <g transform="translate(1286 468) rotate(-28)" opacity="0.28">
      <ellipse cx="0" cy="-34" rx="42" ry="52" fill="none" stroke="currentColor" strokeWidth="3" />
      <g stroke="currentColor" strokeWidth="1" opacity="0.75">
        <path d="M -28 -66 L -28 -4 M -9.5 -76 L -9.5 4 M 9.5 -76 L 9.5 4 M 28 -66 L 28 -4" />
        <path d="M -38 -54 L 38 -54 M -41.5 -34 L 41.5 -34 M -38 -14 L 38 -14" />
      </g>
      <line x1="-8" y1="16" x2="-8" y2="74" stroke="currentColor" strokeWidth="3" />
      <line x1="8" y1="16" x2="8" y2="74" stroke="currentColor" strokeWidth="3" />
      <rect x="-11" y="44" width="22" height="34" rx="5" fill="none" stroke="currentColor" strokeWidth="2.5" />
    </g>
  </svg>
);
