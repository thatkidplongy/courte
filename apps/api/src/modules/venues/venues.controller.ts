import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common';
import {
  addBlackoutBodySchema,
  dashboardQuerySchema,
  recordPaymentBodySchema,
  recordWalkInBodySchema,
  type AddBlackoutBody,
  type DashboardQuery,
  type RecordPaymentBody,
  type RecordPaymentResponse,
  type RecordWalkInBody,
  type RecordWalkInResponse,
  type VenueDashboardResponse,
  type VenueMembershipSummary,
} from '@courte/contract';

import { JwtAuthGuard } from '@/common/auth.guards';
import { CurrentUserId } from '@/common/currentUser.decorator';
import { validateWith } from '@/common/zodValidation.pipe';
import { parseId } from '@/lib/validation';

import { VenuesService } from './venues.service';

@Controller('venues')
@UseGuards(JwtAuthGuard)
export class VenuesController {
  constructor(private readonly venues: VenuesService) {}

  /**
   * Declared before ':venueId/...' so the literal segment wins the match — otherwise
   * "memberships" would be read as a venue id and 400 on the uuid check.
   */
  @Get('memberships')
  listMemberships(@CurrentUserId() userId: number): Promise<VenueMembershipSummary[]> {
    return this.venues.listMemberships(userId);
  }

  @Get(':venueId/dashboard')
  getDashboard(
    @CurrentUserId() userId: number,
    @Param('venueId') venueId: string,
    @Query(validateWith(dashboardQuerySchema)) query: DashboardQuery
  ): Promise<VenueDashboardResponse> {
    return this.venues.getDashboard(userId, parseId(venueId, 'venueId'), query.fromIso, query.toIso);
  }

  @Post(':venueId/walk-ins')
  @HttpCode(HttpStatus.CREATED)
  recordWalkIn(
    @CurrentUserId() userId: number,
    @Param('venueId') venueId: string,
    @Body(validateWith(recordWalkInBodySchema)) body: RecordWalkInBody
  ): Promise<RecordWalkInResponse> {
    return this.venues.recordWalkIn(userId, parseId(venueId, 'venueId'), body);
  }

  @Post(':venueId/blackouts')
  @HttpCode(HttpStatus.CREATED)
  addBlackout(
    @CurrentUserId() userId: number,
    @Param('venueId') venueId: string,
    @Body(validateWith(addBlackoutBodySchema)) body: AddBlackoutBody
  ): Promise<void> {
    return this.venues.addBlackout(userId, parseId(venueId, 'venueId'), body);
  }

  @Post(':venueId/payments')
  @HttpCode(HttpStatus.CREATED)
  recordPayment(
    @CurrentUserId() userId: number,
    @Param('venueId') venueId: string,
    @Body(validateWith(recordPaymentBodySchema)) body: RecordPaymentBody
  ): Promise<RecordPaymentResponse> {
    return this.venues.recordPayment(userId, parseId(venueId, 'venueId'), body);
  }
}
