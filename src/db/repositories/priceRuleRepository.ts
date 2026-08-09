import { query } from '@/db/client';
import type { PriceRule } from '@/domain/pricing/resolveQuote';

type PriceRuleRow = {
  id: string;
  court_id: string;
  priority: number;
  day_of_week: number | null;
  starts_at: string | null;
  ends_at: string | null;
  member_only: boolean;
  rate_per_hour_cents: number;
};

export const findPriceRulesForCourts = async (courtIds: string[]): Promise<PriceRule[]> => {
  if (courtIds.length === 0) return [];

  const rows = await query<PriceRuleRow>(
    `
    SELECT id, court_id, priority, day_of_week, starts_at::text AS starts_at, ends_at::text AS ends_at,
           member_only, rate_per_hour_cents
    FROM price_rules
    WHERE court_id = ANY($1::uuid[])
    ORDER BY priority DESC
    `,
    [courtIds]
  );

  return rows.map(row => ({
    id: row.id,
    courtId: row.court_id,
    priority: row.priority,
    dayOfWeek: row.day_of_week,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    memberOnly: row.member_only,
    ratePerHourCents: row.rate_per_hour_cents,
  }));
};
