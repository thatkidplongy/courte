import Link from 'next/link';

import { cn } from '@/lib/utils';

type PaginationProps = {
  page: number;
  totalPages: number;
  /** Given a page number, returns the href for it with every active filter preserved. */
  buildHref: (page: number) => string;
  className?: string;
};

const STEP_CLASSES =
  'border-border hover:bg-muted inline-flex items-center justify-center rounded-md border px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.08em] transition';

type StepProps = {
  href: string;
  enabled: boolean;
  label: string;
};

/**
 * A disabled step is a `<span>`, not a styled-dead `<a>`. Anchors without an href are not
 * focusable and announce as plain text anyway, so the element should match the behaviour.
 */
const Step = ({ href, enabled, label }: StepProps) =>
  enabled ? (
    <Link href={href} className={STEP_CLASSES}>
      {label}
    </Link>
  ) : (
    <span aria-disabled="true" className={cn(STEP_CLASSES, 'pointer-events-none opacity-45')}>
      {label}
    </span>
  );

export const Pagination = ({ page, totalPages, buildHref, className }: PaginationProps) => {
  if (totalPages <= 1) return null;

  return (
    <nav
      className={cn('border-ink mt-10 flex items-center justify-between gap-3 border-t-2 pt-6', className)}
      aria-label="Pagination"
    >
      <Step href={buildHref(page - 1)} enabled={page > 1} label="← Previous" />
      <span className="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.12em]">
        Page {page} of {totalPages}
      </span>
      <Step href={buildHref(page + 1)} enabled={page < totalPages} label="Next →" />
    </nav>
  );
};
