import Link from 'next/link';

import { ArrowRightIcon } from '@/components/atoms/Icon';

type SectionHeadingProps = {
  title: string;
  meta?: string;
  action?: { href: string; label: string };
};

export const SectionHeading = ({ title, meta, action }: SectionHeadingProps) => (
  <div className="flex flex-wrap items-baseline justify-between gap-3">
    <h2 className="text-3xl font-extrabold tracking-tight">{title}</h2>
    {meta ? <span className="text-muted-foreground text-[12.5px] font-medium">{meta}</span> : null}
    {action ? (
      <Link
        href={action.href}
        className="text-brand-700 hover:text-ink flex items-center gap-1.5 text-[13px] font-bold transition"
      >
        {action.label}
        <ArrowRightIcon className="h-3.5 w-3.5" />
      </Link>
    ) : null}
  </div>
);
