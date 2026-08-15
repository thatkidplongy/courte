import { query } from '@/db/client';
import type { PriceRule } from '@/domain/pricing/resolveQuote';

type PriceRuleRow = {
  id: string;
  court_id: string;
  priority: number;
  day_of_week: number | null;
  starts_at: string | null;
  ends_at: string | null;
  valid_from: string | null;
  valid_to: string | null;
  member_only: boolean;
  rate_per_hour_cents: number;
};

const PRICE_RULE_COLUMNS = `
  id, court_id, priority, day_of_week,
  starts_at::text  AS starts_at,
  ends_at::text    AS ends_at,
  valid_from::text AS valid_from,
  valid_to::text   AS valid_to,
  member_only, rate_per_hour_cents
`;

/**
 * The secondary ordering is not decoration. Resolution takes the highest-priority match, and
 * `ORDER BY priority DESC` alone leaves ties in whatever order Postgres felt like — so a court
 * with two equal-priority rules could quote differently between two identical requests.
 * `resolveQuote` re-sorts defensively; this makes the two agree.
 */
const PRICE_RULE_ORDER = 'ORDER BY priority DESC, created_at DESC, id';

const toPriceRule = (row: PriceRuleRow): PriceRule => ({
  id: row.id,
  courtId: row.court_id,
  priority: row.priority,
  dayOfWeek: row.day_of_week,
  startsAt: row.starts_at,
  endsAt: row.ends_at,
  validFrom: row.valid_from,
  validTo: row.valid_to,
  memberOnly: row.member_only,
  ratePerHourCents: row.rate_per_hour_cents,
});

export const findPriceRulesForCourts = async (courtIds: string[]): Promise<PriceRule[]> => {
  if (courtIds.length === 0) return [];

  const rows = await query<PriceRuleRow>(
    `
    SELECT ${PRICE_RULE_COLUMNS}
    FROM price_rules
    WHERE court_id = ANY($1::uuid[])
    ${PRICE_RULE_ORDER}
    `,
    [courtIds]
  );

  return rows.map(toPriceRule);
};

/** One court's rules, for the owner's pricing screen and for the conflict check on save. */
export const findPriceRulesForCourt = async (courtId: string): Promise<PriceRule[]> => {
  const rows = await query<PriceRuleRow>(
    `SELECT ${PRICE_RULE_COLUMNS} FROM price_rules WHERE court_id = $1 ${PRICE_RULE_ORDER}`,
    [courtId]
  );
  return rows.map(toPriceRule);
};

export const findPriceRuleById = async (ruleId: string): Promise<PriceRule | null> => {
  const rows = await query<PriceRuleRow>(`SELECT ${PRICE_RULE_COLUMNS} FROM price_rules WHERE id = $1`, [ruleId]);
  const row = rows[0];
  return row ? toPriceRule(row) : null;
};

export type PriceRuleWrite = {
  courtId: string;
  priority: number;
  dayOfWeek: number | null;
  startsAt: string | null;
  endsAt: string | null;
  validFrom: string | null;
  validTo: string | null;
  memberOnly: boolean;
  ratePerHourCents: number;
};

export const insertPriceRule = async (rule: PriceRuleWrite): Promise<PriceRule> => {
  const rows = await query<PriceRuleRow>(
    `
    INSERT INTO price_rules
      (court_id, priority, day_of_week, starts_at, ends_at, valid_from, valid_to, member_only, rate_per_hour_cents)
    VALUES ($1, $2, $3, $4::time, $5::time, $6::date, $7::date, $8, $9)
    RETURNING ${PRICE_RULE_COLUMNS}
    `,
    [
      rule.courtId,
      rule.priority,
      rule.dayOfWeek,
      rule.startsAt,
      rule.endsAt,
      rule.validFrom,
      rule.validTo,
      rule.memberOnly,
      rule.ratePerHourCents,
    ]
  );

  return toPriceRule(rows[0]!);
};

export const updatePriceRule = async (ruleId: string, rule: PriceRuleWrite): Promise<PriceRule | null> => {
  const rows = await query<PriceRuleRow>(
    `
    UPDATE price_rules
    SET priority = $2, day_of_week = $3, starts_at = $4::time, ends_at = $5::time,
        valid_from = $6::date, valid_to = $7::date, member_only = $8, rate_per_hour_cents = $9
    WHERE id = $1
    RETURNING ${PRICE_RULE_COLUMNS}
    `,
    [
      ruleId,
      rule.priority,
      rule.dayOfWeek,
      rule.startsAt,
      rule.endsAt,
      rule.validFrom,
      rule.validTo,
      rule.memberOnly,
      rule.ratePerHourCents,
    ]
  );

  const row = rows[0];
  return row ? toPriceRule(row) : null;
};

/**
 * A genuine DELETE, and the one place in the inventory where that is right. A price rule is a
 * statement about the future — bookings already sold carry their own `rate_snapshot` and never
 * consult this table again, so removing a rule cannot rewrite anything that has happened.
 */
export const deletePriceRule = async (ruleId: string): Promise<boolean> => {
  const rows = await query<{ id: string }>('DELETE FROM price_rules WHERE id = $1 RETURNING id', [ruleId]);
  return rows.length > 0;
};
