import { Controller, Get } from '@nestjs/common';
import type { Amenity } from '@courte/contract';

import { listAmenities } from '@/db/repositories/amenityRepository';

/**
 * The amenity catalogue, public and unpaginated. It is a closed, slow-moving list — six rows
 * today — so a page ceiling would be machinery guarding against a growth that cannot happen
 * without somebody deliberately inserting it.
 *
 * No service layer, for the same reason `IdentitiesController` has none: there is no
 * orchestration here to put in one, and a class that only forwards a call is not a boundary.
 */
@Controller('amenities')
export class AmenitiesController {
  @Get()
  listAmenities(): Promise<Amenity[]> {
    return listAmenities();
  }
}
