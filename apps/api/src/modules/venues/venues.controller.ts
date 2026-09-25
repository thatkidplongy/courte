import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common';
import {
  addBlackoutBodySchema,
  addVenueMemberBodySchema,
  dashboardQuerySchema,
  markNoShowBodySchema,
  recordPaymentBodySchema,
  recordWalkInBodySchema,
  type AddBlackoutBody,
  type AddVenueMemberBody,
  type DashboardQuery,
  type MarkNoShowBody,
  type RecordPaymentBody,
  type RecordPaymentResponse,
  type RecordWalkInBody,
  type RecordWalkInResponse,
  type VenueDashboardResponse,
  type VenueMembershipSummary,
  type VenueStaffMember,
} from '@courte/contract';

import { JwtAuthGuard } from '@/common/auth.guards';
import { CurrentUserId } from '@/common/currentUser.decorator';
import { validateWith } from '@/common/zodValidation.pipe';
import { parseId } from '@/lib/validation';

import { VenueDashboardService } from './venueDashboard.service';
import { VenueDeskService } from './venueDesk.service';
import { VenueStaffService } from './venueStaff.service';

@Controller('venues')
@UseGuards(JwtAuthGuard)
export class VenuesController {
  constructor(
    private readonly dashboard: VenueDashboardService,
    private readonly desk: VenueDeskService,
    private readonly staff: VenueStaffService
  ) {}

  /**
   * Declared before ':venueId/...' so the literal segment wins the match — otherwise
   * "memberships" would be read as a venue id and 400 on the uuid check.
   */
  @Get('memberships')
  listMemberships(@CurrentUserId() userId: number): Promise<VenueMembershipSummary[]> {
    return this.dashboard.listMemberships(userId);
  }

  @Get(':venueId/dashboard')
  getDashboard(
    @CurrentUserId() userId: number,
    @Param('venueId') venueId: string,
    @Query(validateWith(dashboardQuerySchema)) query: DashboardQuery
  ): Promise<VenueDashboardResponse> {
    return this.dashboard.getDashboard(userId, parseId(venueId, 'venueId'), query.fromIso, query.toIso);
  }

  @Post(':venueId/walk-ins')
  @HttpCode(HttpStatus.CREATED)
  recordWalkIn(
    @CurrentUserId() userId: number,
    @Param('venueId') venueId: string,
    @Body(validateWith(recordWalkInBodySchema)) body: RecordWalkInBody
  ): Promise<RecordWalkInResponse> {
    return this.desk.recordWalkIn(userId, parseId(venueId, 'venueId'), body);
  }

  @Post(':venueId/blackouts')
  @HttpCode(HttpStatus.CREATED)
  addBlackout(
    @CurrentUserId() userId: number,
    @Param('venueId') venueId: string,
    @Body(validateWith(addBlackoutBodySchema)) body: AddBlackoutBody
  ): Promise<void> {
    return this.desk.addBlackout(userId, parseId(venueId, 'venueId'), body);
  }

  @Post(':venueId/payments')
  @HttpCode(HttpStatus.CREATED)
  recordPayment(
    @CurrentUserId() userId: number,
    @Param('venueId') venueId: string,
    @Body(validateWith(recordPaymentBodySchema)) body: RecordPaymentBody
  ): Promise<RecordPaymentResponse> {
    return this.desk.recordPayment(userId, parseId(venueId, 'venueId'), body);
  }

  /**
   * The booking is in the body rather than the path because this route is venue-scoped: the
   * venue is what authorises the action, and putting the booking in the path would suggest the
   * booking does.
   */
  @Post(':venueId/no-shows')
  @HttpCode(HttpStatus.NO_CONTENT)
  markNoShow(
    @CurrentUserId() userId: number,
    @Param('venueId') venueId: string,
    @Body(validateWith(markNoShowBodySchema)) body: MarkNoShowBody
  ): Promise<void> {
    return this.desk.markNoShow(userId, parseId(venueId, 'venueId'), body.bookingId);
  }

  @Get(':venueId/staff')
  listStaff(@CurrentUserId() userId: number, @Param('venueId') venueId: string): Promise<VenueStaffMember[]> {
    return this.staff.listStaff(userId, parseId(venueId, 'venueId'));
  }

  @Post(':venueId/staff')
  @HttpCode(HttpStatus.NO_CONTENT)
  addStaff(
    @CurrentUserId() userId: number,
    @Param('venueId') venueId: string,
    @Body(validateWith(addVenueMemberBodySchema)) body: AddVenueMemberBody
  ): Promise<void> {
    return this.staff.addStaff(userId, parseId(venueId, 'venueId'), body);
  }

  @Delete(':venueId/staff/:memberId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeStaff(
    @CurrentUserId() userId: number,
    @Param('venueId') venueId: string,
    @Param('memberId') memberId: string
  ): Promise<void> {
    return this.staff.removeStaff(userId, parseId(venueId, 'venueId'), parseId(memberId, 'memberId'));
  }
}
