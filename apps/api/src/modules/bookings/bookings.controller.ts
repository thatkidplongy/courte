import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common';
import {
  listBookingsQuerySchema,
  placeHoldBodySchema,
  type BookingSummary,
  type ListBookingsQuery,
  type Paginated,
  type PlaceHoldBody,
  type PlaceHoldResponse,
} from '@courte/contract';

import { JwtAuthGuard } from '@/common/auth.guards';
import { CurrentUserId } from '@/common/currentUser.decorator';
import { validateWith } from '@/common/zodValidation.pipe';
import { parseId } from '@/lib/validation';

import { BookingsService } from './bookings.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  /**
   * A hold is its own resource, not a booking field — it is created, it expires on its own,
   * and it is what the checkout page is actually looking at.
   */
  @Post('holds')
  placeHold(
    @CurrentUserId() userId: number,
    @Body(validateWith(placeHoldBodySchema)) body: PlaceHoldBody
  ): Promise<PlaceHoldResponse> {
    return this.bookings.placeHold(userId, body);
  }

  @Get('bookings')
  listBookings(
    @CurrentUserId() userId: number,
    @Query(validateWith(listBookingsQuerySchema)) query: ListBookingsQuery
  ): Promise<Paginated<BookingSummary>> {
    return this.bookings.listBookings(userId, query.page, query.limit);
  }

  @Get('bookings/:bookingId')
  getBooking(@CurrentUserId() userId: number, @Param('bookingId') bookingId: string): Promise<BookingSummary> {
    return this.bookings.getBookingDetail(userId, parseId(bookingId, 'bookingId'));
  }

  /**
   * Confirm and cancel are cascading state changes with their own rules, not field edits, so
   * they are POST actions with the verb last rather than a PATCH on status.
   */
  @Post('bookings/:bookingId/confirm')
  @HttpCode(HttpStatus.NO_CONTENT)
  confirmBooking(@CurrentUserId() userId: number, @Param('bookingId') bookingId: string): Promise<void> {
    return this.bookings.confirmBooking(userId, parseId(bookingId, 'bookingId'));
  }

  @Post('bookings/:bookingId/cancel')
  @HttpCode(HttpStatus.NO_CONTENT)
  cancelBooking(@CurrentUserId() userId: number, @Param('bookingId') bookingId: string): Promise<void> {
    return this.bookings.cancelBooking(userId, parseId(bookingId, 'bookingId'));
  }
}
