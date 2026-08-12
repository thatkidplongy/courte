import Link from 'next/link';

import { CourtMark } from '@/components/icons';

export const Footer = () => (
  <footer className="bg-ink-950 mt-20 text-white">
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-12 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <CourtMark className="text-court-400 h-6 w-6" />
          COURTE
        </p>
        <p className="mt-2 max-w-xs text-sm leading-relaxed text-neutral-400">
          Courts. Players. Together. The easiest way to book and play.
        </p>
      </div>
      <div className="flex gap-16 text-sm">
        <div className="flex flex-col gap-2.5">
          <p className="font-semibold text-neutral-200">For players</p>
          <Link href="/" className="text-neutral-400 transition hover:text-white">
            Find a court
          </Link>
          <Link href="/bookings" className="text-neutral-400 transition hover:text-white">
            My bookings
          </Link>
        </div>
        <div className="flex flex-col gap-2.5">
          <p className="font-semibold text-neutral-200">For venues</p>
          <span className="text-neutral-400">List your venue</span>
          <span className="text-neutral-400">Owner dashboard</span>
        </div>
      </div>
    </div>
    <div className="border-t border-white/5">
      <p className="mx-auto max-w-6xl px-6 py-5 text-xs text-neutral-500">© 2026 Courte. All rights reserved.</p>
    </div>
  </footer>
);
