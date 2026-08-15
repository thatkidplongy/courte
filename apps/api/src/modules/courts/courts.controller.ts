import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  courtAvailabilityQuerySchema,
  searchCourtsQuerySchema,
  venueScheduleQuerySchema,
  type CourtAvailabilityQuery,
  type CourtAvailabilityResponse,
  type CourtSearchItem,
  type Paginated,
  type SearchCourtsQuery,
  type VenueScheduleQuery,
  type VenueScheduleResponse,
} from '@courte/contract';

import { validateWith } from '@/common/zodValidation.pipe';
import { parseId } from '@/lib/validation';

import { CourtsService } from './courts.service';

/**
 * Public reads — no token required. Controllers own HTTP and nothing else: bind, validate,
 * delegate, return. There is no business logic below this line.
 */
@Controller('courts')
export class CourtsController {
  constructor(private readonly courts: CourtsService) {}

  @Get()
  searchCourts(
    @Query(validateWith(searchCourtsQuerySchema)) query: SearchCourtsQuery
  ): Promise<Paginated<CourtSearchItem>> {
    return this.courts.searchCourts(query);
  }

  /**
   * Declared before ':courtId' so the two-segment route wins the match — Nest takes the first
   * declaration that fits, and ':courtId' alone would never see this path.
   */
  @Get(':courtId/schedule')
  getSchedule(
    @Param('courtId') courtId: string,
    @Query(validateWith(venueScheduleQuerySchema)) query: VenueScheduleQuery
  ): Promise<VenueScheduleResponse> {
    return this.courts.getVenueSchedule(parseId(courtId, 'courtId'), query.date);
  }

  @Get(':courtId')
  getAvailability(
    @Param('courtId') courtId: string,
    @Query(validateWith(courtAvailabilityQuerySchema)) query: CourtAvailabilityQuery
  ): Promise<CourtAvailabilityResponse> {
    return this.courts.getAvailability(parseId(courtId, 'courtId'), query.date);
  }
}
