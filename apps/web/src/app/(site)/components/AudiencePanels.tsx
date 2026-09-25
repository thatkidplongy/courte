import Link from 'next/link';

import { ArrowRightIcon, CheckIcon } from '@/components/atoms/Icon';
import { DashboardPreview } from '@/components/molecules/DashboardPreview';

const PLAYER_POINTS = [
  'Book a court in seconds',
  'Live availability and instant confirmation',
  'Pay at the desk or online at checkout',
  'Recurring bookings, and a waitlist when a slot frees up',
] as const;

const VENUE_POINTS = [
  'Manage court availability and blackouts',
  'Take walk-ins and desk payments',
  'Accept bookings around the clock',
  'See the whole day at a glance',
] as const;

const PointList = ({ points }: { points: readonly string[] }) => (
  <ul className="mt-5 flex flex-col gap-3 text-[13.5px] font-medium leading-snug">
    {points.map(point => (
      <li key={point} className="flex gap-2.5">
        <CheckIcon className="text-primary mt-0.5 h-4 w-4" />
        {point}
      </li>
    ))}
  </ul>
);

export const AudiencePanels = ({ dateIso }: { dateIso: string }) => (
  <section className="mt-14 grid gap-6 lg:grid-cols-2">
    <div className="bg-accent rounded-md p-9">
      <h3 className="text-2xl font-extrabold tracking-tight">For players</h3>
      <PointList points={PLAYER_POINTS} />
      <Link
        href={`/courts?date=${dateIso}`}
        className="bg-primary hover:bg-brand-700 mt-7 inline-flex items-center gap-2 rounded-md px-5 py-3 text-[13.5px] font-bold text-white transition"
      >
        Find a court
        <ArrowRightIcon className="h-3.5 w-3.5" />
      </Link>
    </div>

    <div className="bg-muted grid gap-6 rounded-md p-9 lg:grid-cols-2">
      <div>
        <h3 className="text-2xl font-extrabold tracking-tight">For venue owners</h3>
        <p className="text-muted-foreground mt-2.5 text-[13.5px]">Grow your venue with Courte.</p>
        <PointList points={VENUE_POINTS} />
        {/* No call to action: there is no self-serve onboarding yet, and a button that leads
            nowhere would be the most prominent broken promise on the page. */}
        <p className="text-muted-foreground mt-7 text-[12.5px] font-medium">
          Venue accounts are set up by the Courte team. Sign in to reach your dashboard.
        </p>
      </div>

      <DashboardPreview className="self-start" />
    </div>
  </section>
);
