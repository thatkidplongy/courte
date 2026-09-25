import { Module } from '@nestjs/common';

import { VenueDashboardService } from './venueDashboard.service';
import { VenueDeskService } from './venueDesk.service';
import { VenueStaffService } from './venueStaff.service';
import { VenuesController } from './venues.controller';

@Module({
  controllers: [VenuesController],
  providers: [VenueDashboardService, VenueDeskService, VenueStaffService],
})
export class VenuesModule {}
