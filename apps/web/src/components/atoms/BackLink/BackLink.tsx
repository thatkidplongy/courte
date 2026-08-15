import Link from 'next/link';

type BackLinkProps = {
  href: string;
  children: string;
};

export const BackLink = ({ href, children }: BackLinkProps) => (
  <Link
    href={href}
    className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-[13px] font-semibold transition"
  >
    <span aria-hidden>←</span>
    {children}
  </Link>
);
