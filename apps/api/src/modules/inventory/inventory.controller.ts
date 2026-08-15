import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, UseGuards } from '@nestjs/common';
import {
  replaceOpeningWindowsBodySchema,
  upsertCourtBodySchema,
  upsertPriceRuleBodySchema,
  type CourtPricingResponse,
  type OpeningWindowSummary,
  type OwnedCourt,
  type PriceRuleSummary,
  type ReplaceOpeningWindowsBody,
  type UpsertCourtBody,
  type UpsertPriceRuleBody,
} from '@courte/contract';

import { JwtAuthGuard } from '@/common/auth.guards';
import { CurrentUserId } from '@/common/currentUser.decorator';
import { validateWith } from '@/common/zodValidation.pipe';
import { parseId } from '@/lib/validation';

import { InventoryService } from './inventory.service';

/**
 * Owner-side inventory, nested under the venue that owns it. The path states the ownership the
 * service then proves: nothing here is reachable by court id alone, so a court id lifted from
 * a public search page is not a way into somebody else's price list.
 */
@Controller('venues/:venueId')
@UseGuards(JwtAuthGuard)
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get('courts')
  listCourts(@CurrentUserId() userId: string, @Param('venueId') venueId: string): Promise<OwnedCourt[]> {
    return this.inventory.listCourts(userId, parseId(venueId, 'venueId'));
  }

  @Post('courts')
  @HttpCode(HttpStatus.CREATED)
  createCourt(
    @CurrentUserId() userId: string,
    @Param('venueId') venueId: string,
    @Body(validateWith(upsertCourtBodySchema)) body: UpsertCourtBody
  ): Promise<{ courtId: string }> {
    return this.inventory.createCourt(userId, parseId(venueId, 'venueId'), body);
  }

  @Put('courts/:courtId')
  @HttpCode(HttpStatus.NO_CONTENT)
  updateCourt(
    @CurrentUserId() userId: string,
    @Param('venueId') venueId: string,
    @Param('courtId') courtId: string,
    @Body(validateWith(upsertCourtBodySchema)) body: UpsertCourtBody
  ): Promise<void> {
    return this.inventory.updateCourt(userId, parseId(venueId, 'venueId'), parseId(courtId, 'courtId'), body);
  }

  /**
   * DELETE archives; it does not remove. The verb is the reader's intent — retire this court —
   * and the restore is its own route rather than a flag on this one, because undoing is a
   * different decision from doing.
   */
  @Delete('courts/:courtId')
  @HttpCode(HttpStatus.NO_CONTENT)
  archiveCourt(
    @CurrentUserId() userId: string,
    @Param('venueId') venueId: string,
    @Param('courtId') courtId: string
  ): Promise<void> {
    return this.inventory.setCourtArchived(userId, parseId(venueId, 'venueId'), parseId(courtId, 'courtId'), true);
  }

  @Post('courts/:courtId/restore')
  @HttpCode(HttpStatus.NO_CONTENT)
  restoreCourt(
    @CurrentUserId() userId: string,
    @Param('venueId') venueId: string,
    @Param('courtId') courtId: string
  ): Promise<void> {
    return this.inventory.setCourtArchived(userId, parseId(venueId, 'venueId'), parseId(courtId, 'courtId'), false);
  }

  @Get('courts/:courtId/pricing')
  getPricing(
    @CurrentUserId() userId: string,
    @Param('venueId') venueId: string,
    @Param('courtId') courtId: string
  ): Promise<CourtPricingResponse> {
    return this.inventory.getPricing(userId, parseId(venueId, 'venueId'), parseId(courtId, 'courtId'));
  }

  @Post('courts/:courtId/price-rules')
  @HttpCode(HttpStatus.CREATED)
  createPriceRule(
    @CurrentUserId() userId: string,
    @Param('venueId') venueId: string,
    @Param('courtId') courtId: string,
    @Body(validateWith(upsertPriceRuleBodySchema)) body: UpsertPriceRuleBody
  ): Promise<PriceRuleSummary> {
    return this.inventory.createPriceRule(userId, parseId(venueId, 'venueId'), parseId(courtId, 'courtId'), body);
  }

  @Put('courts/:courtId/price-rules/:ruleId')
  updatePriceRule(
    @CurrentUserId() userId: string,
    @Param('venueId') venueId: string,
    @Param('courtId') courtId: string,
    @Param('ruleId') ruleId: string,
    @Body(validateWith(upsertPriceRuleBodySchema)) body: UpsertPriceRuleBody
  ): Promise<PriceRuleSummary> {
    return this.inventory.updatePriceRule(
      userId,
      parseId(venueId, 'venueId'),
      parseId(courtId, 'courtId'),
      parseId(ruleId, 'ruleId'),
      body
    );
  }

  /**
   * A real delete, and the only one in the inventory. A price rule is a statement about the
   * future; bookings already sold carry their own rate snapshot and never read this table
   * again, so removing a rule cannot rewrite anything that has already happened.
   */
  @Delete('courts/:courtId/price-rules/:ruleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deletePriceRule(
    @CurrentUserId() userId: string,
    @Param('venueId') venueId: string,
    @Param('courtId') courtId: string,
    @Param('ruleId') ruleId: string
  ): Promise<void> {
    return this.inventory.deletePriceRule(
      userId,
      parseId(venueId, 'venueId'),
      parseId(courtId, 'courtId'),
      parseId(ruleId, 'ruleId')
    );
  }

  /** PUT, not PATCH: the caller sends the whole week and the whole week is what is stored. */
  @Put('courts/:courtId/opening-windows')
  replaceOpeningWindows(
    @CurrentUserId() userId: string,
    @Param('venueId') venueId: string,
    @Param('courtId') courtId: string,
    @Body(validateWith(replaceOpeningWindowsBodySchema)) body: ReplaceOpeningWindowsBody
  ): Promise<OpeningWindowSummary[]> {
    return this.inventory.replaceOpeningWindows(userId, parseId(venueId, 'venueId'), parseId(courtId, 'courtId'), body);
  }
}
