import { cn } from '@/lib/utils';

type AvatarProps = {
  name: string;
  className?: string;
};

/**
 * Initials on a mint disc. Two letters at most — three starts to look like a stock ticker, and
 * a single-word name should not render half an alphabet.
 */
export const toInitials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word[0]?.toUpperCase() ?? '')
    .join('');

export const Avatar = ({ name, className }: AvatarProps) => (
  <span
    title={name}
    className={cn(
      'bg-accent text-accent-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold',
      className
    )}
  >
    {toInitials(name)}
  </span>
);
