import type { CourtSearchItem } from '@courte/contract';

import { StatTile } from '@/components/molecules/StatTile';
import { formatWholePesos } from '@/lib/format';

/**
 * Read off the result set on screen, so the band can never advertise more than the search
 * actually found. `fromRatePerHourCents` is null for a court with no matching price rule.
 */
const buildStats = (courts: CourtSearchItem[]) => {
  const venueCount = new Set(courts.map(court => court.venueId)).size;
  const rates = courts.map(court => court.fromRatePerHourCents).filter((rate): rate is number => rate !== null);

  return [
    { value: String(venueCount), label: venueCount === 1 ? 'Venue nearby' : 'Venues nearby' },
    { value: String(courts.length), label: courts.length === 1 ? 'Court to book' : 'Courts to book' },
    { value: rates.length === 0 ? '—' : formatWholePesos(Math.min(...rates)), label: 'Cheapest, per hour' },
    { value: '10 min', label: 'Slot hold at checkout' },
  ];
};

export const StatsBand = ({ courts }: { courts: CourtSearchItem[] }) => (
  <section className="border-ink mt-16 border-y-2">
    <dl className="divide-border grid grid-cols-2 sm:grid-cols-4 sm:divide-x">
      {buildStats(courts).map((stat, index) => (
        <StatTile key={stat.label} value={stat.value} label={stat.label} className={index === 0 ? 'py-7' : 'p-7'} />
      ))}
    </dl>
  </section>
);
