import { notFound, redirect } from 'next/navigation';

import type { PriceRuleSummary } from '@courte/contract';

import { auth } from '@/auth';
import { BackLink } from '@/components/atoms/BackLink';
import { PageHeader } from '@/components/molecules/PageHeader';
import { Panel } from '@/components/molecules/Panel';
import { formatWeekday } from '@/consts';
import { fetchCourtPricing } from '@/lib/api';
import { isNotFound } from '@/lib/api/client';
import { formatPesos } from '@/lib/format';
import { parseRouteId } from '@/lib/ids';
import { createPriceRule, deletePriceRule, replaceOpeningWindows } from '@/server-actions/manageInventory';

import { OpeningHoursForm, PriceRuleForm, RemoveRuleButton } from './components/PricingForms';

type PageProps = {
  params: Promise<{ venueId: string; courtId: string }>;
};

/** "Mon–Fri", "Every day", "Christmas Day only" — the rule in the words an owner would use. */
const describeWhen = (rule: PriceRuleSummary): string => {
  const day = rule.dayOfWeek === null ? 'Every day' : formatWeekday(rule.dayOfWeek);
  const time = rule.startsAt && rule.endsAt ? `${rule.startsAt}–${rule.endsAt}` : 'all day';

  return `${day}, ${time}`;
};

const describeDates = (rule: PriceRuleSummary): string => {
  if (rule.validFrom && rule.validTo) {
    return rule.validFrom === rule.validTo ? `on ${rule.validFrom}` : `${rule.validFrom} to ${rule.validTo}`;
  }
  if (rule.validFrom) return `from ${rule.validFrom}`;
  if (rule.validTo) return `until ${rule.validTo}`;
  return 'always';
};

const RuleRow = ({ rule, venueId, courtId }: { rule: PriceRuleSummary; venueId: number; courtId: number }) => (
  <tr className="border-border border-t align-middle">
    <td className="px-5 py-3.5 text-[13px] font-bold">{formatPesos(rule.ratePerHourCents)}</td>
    <td className="px-5 py-3.5 text-[13px] font-medium">{describeWhen(rule)}</td>
    <td className="text-muted-foreground px-5 py-3.5 text-[13px] font-medium">{describeDates(rule)}</td>
    <td className="text-muted-foreground px-5 py-3.5 text-[13px] font-medium tabular-nums">{rule.priority}</td>
    <td className="px-5 py-3.5">
      <RemoveRuleButton venueId={venueId} courtId={courtId} ruleId={rule.id} action={deletePriceRule} />
    </td>
  </tr>
);

const RULE_HEADINGS = ['Rate', 'When', 'Dates', 'Priority', ''] as const;

const ManagePricingPage = async ({ params }: PageProps) => {
  const session = await auth();
  if (!session?.courteUserId) redirect('/');

  const routeParams = await params;

  const venueId = parseRouteId(routeParams.venueId);

  const courtId = parseRouteId(routeParams.courtId);

  if (venueId === null || courtId === null) notFound();

  const pricing = await fetchCourtPricing(session.courteUserId, venueId, courtId).catch(error => {
    if (isNotFound(error)) notFound();
    throw error;
  });

  return (
    <main className="min-w-0 flex-1 px-5 py-6 lg:px-8">
      <BackLink href={`/manage/${venueId}/courts`}>Back to courts</BackLink>

      <div className="mt-5">
        <PageHeader
          title={`${pricing.courtName} — pricing`}
          subtitle={`${pricing.rules.length} ${pricing.rules.length === 1 ? 'rule' : 'rules'} · times are ${pricing.venueTimezone}`}
        />
      </div>

      {/* Not a Panel: the header row and its rules run edge to edge, so the surface cannot
          carry the padding a Panel puts on everything inside it. */}
      <section className="border-border mt-6 overflow-hidden rounded-md border">
        <div className="border-ink flex items-center justify-between border-b-2 px-5 py-4">
          <h2 className="text-[15px] font-extrabold tracking-tight">Rate card</h2>
          <span className="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.08em]">
            Highest priority wins
          </span>
        </div>

        {pricing.rules.length === 0 ? (
          <p className="text-muted-foreground px-5 py-8 text-sm">
            No rules yet — this court cannot be booked until it has a price.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted">
                  {RULE_HEADINGS.map((heading, index) => (
                    <th
                      key={heading || index}
                      className="text-muted-foreground whitespace-nowrap px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em]"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pricing.rules.map(rule => (
                  <RuleRow key={rule.id} rule={rule} venueId={venueId} courtId={courtId} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel
          title="Add a rate"
          description="Leave a field blank for “any”. A higher priority beats a lower one where they overlap."
        >
          <PriceRuleForm venueId={venueId} courtId={courtId} action={createPriceRule} />
        </Panel>

        <Panel title="Opening hours" description="Untick a day to close it. Saved as a whole week.">
          <OpeningHoursForm
            venueId={venueId}
            courtId={courtId}
            windows={pricing.openingWindows}
            action={replaceOpeningWindows}
          />
        </Panel>
      </div>
    </main>
  );
};

export default ManagePricingPage;
