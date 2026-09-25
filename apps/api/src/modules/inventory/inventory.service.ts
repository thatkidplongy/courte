import { Injectable } from '@nestjs/common';
import type {
  CourtPricingResponse,
  OpeningWindowSummary,
  OwnedCourt,
  PriceRuleSummary,
  ReplaceOpeningWindowsBody,
  UpsertCourtBody,
  UpsertPriceRuleBody,
} from '@courte/contract';

import {
  findCourtForOwner,
  findCourtsForOwner,
  insertCourt,
  setCourtArchived,
  updateCourt,
} from '@/db/repositories/courtRepository';
import { findOpeningWindowsForCourt, replaceOpeningWindows } from '@/db/repositories/openingWindowRepository';
import { findFutureSoldSlots } from '@/db/repositories/reservationRepository';
import { membershipReader } from '@/db/repositories/membershipRepository';
import {
  deletePriceRule,
  findPriceRuleById,
  findPriceRulesForCourt,
  insertPriceRule,
  updatePriceRule,
} from '@/db/repositories/priceRuleRepository';
import { findVenueSummary } from '@/db/repositories/venueRepository';
import { requireVenueAction } from '@/domain/authz/venueAccess';
import { NotFoundError } from '@/domain/errors';
import { assertNoRuleConflict } from '@/domain/pricing/assertNoRuleConflict';
import type { PriceRule } from '@/domain/pricing/resolveQuote';
import { assertWindowsCoverBookings } from '@/domain/schedule/assertWindowsCoverBookings';

const toSummary = (rule: PriceRule): PriceRuleSummary => ({
  id: rule.id,
  courtId: rule.courtId,
  priority: rule.priority,
  dayOfWeek: rule.dayOfWeek,
  startsAt: rule.startsAt === null ? null : rule.startsAt.slice(0, 5),
  endsAt: rule.endsAt === null ? null : rule.endsAt.slice(0, 5),
  validFrom: rule.validFrom,
  validTo: rule.validTo,
  memberOnly: rule.memberOnly,
  ratePerHourCents: rule.ratePerHourCents,
});

/**
 * What a venue sells, when it is open, and what it costs — the owner's side of the inventory.
 *
 * Kept apart from `VenueDeskService`, which runs the desk: taking a walk-in and changing the price
 * list are different jobs done by different people, and the permission map already says so
 * (`recordWalkIn` is staff, `managePricing` is owner-only).
 *
 * Every method re-checks membership for itself. The route guard proves there is a caller; only
 * this proves the caller has anything to do with this venue.
 */
@Injectable()
export class InventoryService {
  async listCourts(userId: number, venueId: number): Promise<OwnedCourt[]> {
    await requireVenueAction(membershipReader, userId, venueId, 'manageCourts');

    const courts = await findCourtsForOwner(venueId);
    return courts.map(court => ({
      id: court.id,
      name: court.name,
      sport: court.sport,
      surface: court.surface,
      minDurationMinutes: court.minDurationMinutes,
      maxDurationMinutes: court.maxDurationMinutes,
      incrementMinutes: court.incrementMinutes,
      bufferMinutes: court.bufferMinutes,
      isArchived: court.isArchived,
    }));
  }

  async createCourt(userId: number, venueId: number, body: UpsertCourtBody): Promise<{ courtId: number }> {
    await requireVenueAction(membershipReader, userId, venueId, 'manageCourts');

    const court = await insertCourt(venueId, body);
    return { courtId: court.id };
  }

  async updateCourt(userId: number, venueId: number, courtId: number, body: UpsertCourtBody): Promise<void> {
    await requireVenueAction(membershipReader, userId, venueId, 'manageCourts');
    await this.requireCourtAtVenue(courtId, venueId);

    const updated = await updateCourt(courtId, body);
    if (!updated) throw new NotFoundError('Court');
  }

  /**
   * Archive, never delete. `reservations.court_id` cascades, so a real DELETE would take the
   * reservations of bookings people have already paid for and leave the bookings pointing at
   * nothing. Restoring is the same call with `isArchived: false`.
   */
  async setCourtArchived(userId: number, venueId: number, courtId: number, isArchived: boolean): Promise<void> {
    await requireVenueAction(membershipReader, userId, venueId, 'manageCourts');
    await this.requireCourtAtVenue(courtId, venueId);

    const changed = await setCourtArchived(courtId, isArchived);
    if (!changed) throw new NotFoundError('Court');
  }

  async getPricing(userId: number, venueId: number, courtId: number): Promise<CourtPricingResponse> {
    await requireVenueAction(membershipReader, userId, venueId, 'managePricing');

    const court = await this.requireCourtAtVenue(courtId, venueId);
    const venue = await findVenueSummary(venueId);
    if (!venue) throw new NotFoundError('Venue');

    const [rules, openingWindows] = await Promise.all([
      findPriceRulesForCourt(courtId),
      findOpeningWindowsForCourt(courtId),
    ]);

    return {
      courtId: court.id,
      courtName: court.name,
      venueTimezone: venue.timezone,
      rules: rules.map(toSummary),
      openingWindows,
    };
  }

  async createPriceRule(
    userId: number,
    venueId: number,
    courtId: number,
    body: UpsertPriceRuleBody
  ): Promise<PriceRuleSummary> {
    await requireVenueAction(membershipReader, userId, venueId, 'managePricing');
    await this.requireCourtAtVenue(courtId, venueId);

    const existing = await findPriceRulesForCourt(courtId);
    assertNoRuleConflict(body, existing);

    return toSummary(await insertPriceRule({ courtId, ...body }));
  }

  async updatePriceRule(
    userId: number,
    venueId: number,
    courtId: number,
    ruleId: number,
    body: UpsertPriceRuleBody
  ): Promise<PriceRuleSummary> {
    await requireVenueAction(membershipReader, userId, venueId, 'managePricing');
    await this.requireCourtAtVenue(courtId, venueId);
    await this.requireRuleOnCourt(ruleId, courtId);

    // Excluding itself, or every edit would find the rule it is editing sitting in its own way.
    const existing = (await findPriceRulesForCourt(courtId)).filter(rule => rule.id !== ruleId);
    assertNoRuleConflict(body, existing);

    const updated = await updatePriceRule(ruleId, { courtId, ...body });
    if (!updated) throw new NotFoundError('Price rule');

    // Bookings already sold are untouched, and deliberately: each carries the segments it was
    // quoted from in `rate_snapshot`, and never asks this table again. The rate at time of sale
    // is a different fact from today's rate, not a stale copy of it.
    return toSummary(updated);
  }

  async deletePriceRule(userId: number, venueId: number, courtId: number, ruleId: number): Promise<void> {
    await requireVenueAction(membershipReader, userId, venueId, 'managePricing');
    await this.requireCourtAtVenue(courtId, venueId);
    await this.requireRuleOnCourt(ruleId, courtId);

    const removed = await deletePriceRule(ruleId);
    if (!removed) throw new NotFoundError('Price rule');
  }

  async replaceOpeningWindows(
    userId: number,
    venueId: number,
    courtId: number,
    body: ReplaceOpeningWindowsBody
  ): Promise<OpeningWindowSummary[]> {
    await requireVenueAction(membershipReader, userId, venueId, 'manageHours');
    await this.requireCourtAtVenue(courtId, venueId);

    const venue = await findVenueSummary(venueId);
    if (!venue) throw new NotFoundError('Venue');

    // Shortening hours over a slot somebody has already paid for would leave the venue having
    // sold a time it no longer admits to being open. Refused, with the offending slots named.
    const slots = await findFutureSoldSlots(courtId, new Date());
    assertWindowsCoverBookings({
      windows: body.windows.map(window => ({ courtId, ...window })),
      timezone: venue.timezone,
      slots,
    });

    await replaceOpeningWindows(courtId, body.windows);
    return findOpeningWindowsForCourt(courtId);
  }

  /**
   * Checks the court belongs to the venue being managed, so a court id borrowed from somewhere
   * else is a 404 rather than an edit that silently lands on another owner's inventory.
   *
   * Uses the owner lookup, which sees archived courts — the discovery one would make restoring
   * a court impossible, since it hides exactly the state the restore is undoing.
   */
  private async requireCourtAtVenue(courtId: number, venueId: number) {
    const court = await findCourtForOwner(courtId);
    if (!court || court.venueId !== venueId) throw new NotFoundError('Court');
    return court;
  }

  private async requireRuleOnCourt(ruleId: number, courtId: number): Promise<void> {
    const rule = await findPriceRuleById(ruleId);
    if (!rule || rule.courtId !== courtId) throw new NotFoundError('Price rule');
  }
}
