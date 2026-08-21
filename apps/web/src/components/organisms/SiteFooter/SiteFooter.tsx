import type { ReactNode } from 'react';

import Link from 'next/link';

import { CourtMark } from '@/components/atoms/Icon';
import { PAGE_GUTTER } from '@/consts';
import { cn } from '@/lib/utils';

type FooterColumnProps = {
  heading: string;
  children: ReactNode;
};

const FooterColumn = ({ heading, children }: FooterColumnProps) => (
  <div>
    <p className="mb-3.5 text-[11px] font-bold uppercase tracking-[0.12em]">{heading}</p>
    <div className="flex flex-col gap-2.5 text-[12.5px] text-white/60">{children}</div>
  </div>
);

const FOOTER_LINK_CLASSES = 'transition hover:text-white';

export const SiteFooter = () => (
  <footer className="bg-night mt-auto text-white">
    <div className={cn(PAGE_GUTTER, 'grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]')}>
      <div>
        <p className="mb-4 flex items-center gap-2.5">
          <CourtMark className="text-primary h-[22px] w-[22px]" />
          <span className="text-[17px] font-extrabold tracking-[0.14em]">COURTE</span>
        </p>
        <p className="max-w-xs text-[12.5px] leading-relaxed text-white/60">
          Courts, players, together.
          <br />
          The easiest way to book and play.
        </p>
      </div>

      <FooterColumn heading="Explore">
        <Link href="/courts" className={FOOTER_LINK_CLASSES}>
          Find a court
        </Link>
        <Link href="/courts?sort=price" className={FOOTER_LINK_CLASSES}>
          Cheapest courts
        </Link>
      </FooterColumn>

      <FooterColumn heading="For players">
        <Link href="/bookings" className={FOOTER_LINK_CLASSES}>
          My bookings
        </Link>
        {/* Plain text, not a link: there is no help centre to point at yet, and a link that
            goes nowhere is worse than a label that promises nothing. */}
        <span>Help centre</span>
      </FooterColumn>

      <FooterColumn heading="For venues">
        <span>List your venue</span>
        <span>Owner dashboard</span>
      </FooterColumn>

      {/* The mockup's fourth column is "Company", with About and Careers beside the two legal
          pages. There is no company story to tell yet and nobody is hiring, so the column
          carries only the two that a service taking bookings genuinely owes its players. */}
      <FooterColumn heading="Company">
        <Link href="/terms" className={FOOTER_LINK_CLASSES}>
          Terms of service
        </Link>
        <Link href="/privacy" className={FOOTER_LINK_CLASSES}>
          Privacy policy
        </Link>
      </FooterColumn>
    </div>

    <div className="border-t border-white/10">
      <div
        className={cn(
          PAGE_GUTTER,
          'flex flex-col gap-1 py-5 text-[11.5px] text-white/45 sm:flex-row sm:justify-between'
        )}
      >
        <p>© 2026 Courte. All rights reserved.</p>
        {/* ODbL requires visible attribution wherever the venue coordinates are shown. */}
        <p>
          Venue locations ©{' '}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2 transition hover:text-white"
          >
            OpenStreetMap contributors
          </a>
        </p>
      </div>
    </div>
  </footer>
);
