import Link from 'next/link';

import { ArrowRightIcon } from '@/components/atoms/Icon';
import { cn } from '@/lib/utils';

type EmptyStateProps = {
  title: string;
  description: string;
  /** An escape hatch out of the empty result, so the reader is never stuck. */
  action?: { href: string; label: string };
  className?: string;
};

export const EmptyState = ({ title, description, action, className }: EmptyStateProps) => (
  <div className={cn('border-border rounded-md border p-12', className)}>
    <p className="text-xl font-extrabold tracking-tight">{title}</p>
    <p className="text-muted-foreground mt-2 text-sm">{description}</p>
    {action ? (
      <Link
        href={action.href}
        className="text-brand-700 hover:text-ink mt-5 inline-flex items-center gap-1.5 text-[13px] font-bold transition"
      >
        {action.label}
        <ArrowRightIcon className="h-3.5 w-3.5" />
      </Link>
    ) : null}
  </div>
);
