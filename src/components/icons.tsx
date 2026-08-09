/** Tiny inline icon set — stroke inherits currentColor, sized by the parent's font size. */

type IconProps = {
  className?: string;
};

const base = 'inline-block shrink-0';

export const ClockIcon = ({ className = 'h-4 w-4' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`${base} ${className}`} aria-hidden>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const CheckIcon = ({ className = 'h-4 w-4' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`${base} ${className}`} aria-hidden>
    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const PinIcon = ({ className = 'h-4 w-4' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`${base} ${className}`} aria-hidden>
    <path d="M12 21s-7-5.5-7-11a7 7 0 1 1 14 0c0 5.5-7 11-7 11z" strokeLinejoin="round" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
);

export const ShieldIcon = ({ className = 'h-4 w-4' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`${base} ${className}`} aria-hidden>
    <path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3z" strokeLinejoin="round" />
  </svg>
);

export const BoltIcon = ({ className = 'h-4 w-4' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`${base} ${className}`} aria-hidden>
    <path d="M13 3L5 13h6l-1 8 8-10h-6l1-8z" strokeLinejoin="round" />
  </svg>
);

export const CourtMark = ({ className = 'h-5 w-5' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={`${base} ${className}`} aria-hidden>
    <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.15" />
    <circle cx="12" cy="12" r="5.5" fill="currentColor" />
  </svg>
);
