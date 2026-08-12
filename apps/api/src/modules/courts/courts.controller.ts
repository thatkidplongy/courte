import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  courtAvailabilityQuerySchema,
  searchCourtsQuerySchema,
  type CourtAvailabilityQuery,
  type CourtAvailabilityResponse,
  type CourtSearchItem,
  type Paginated,
  type SearchCourtsQuery,
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

  @Get(':courtId')
  getAvailability(
    @Param('courtId') courtId: string,
    @Query(validateWith(courtAvailabilityQuerySchema)) query: CourtAvailabilityQuery
  ): Promise<CourtAvailabilityResponse> {
    return this.courts.getAvailability(parseId(courtId, 'courtId'), query.date);
  }
}
