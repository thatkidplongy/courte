import { Module, type MiddlewareConsumer, type NestModule } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';

import { DomainErrorFilter } from '@/common/domainError.filter';
import { RequestContextMiddleware } from '@/common/requestContext';
import { AmenitiesController } from '@/modules/amenities/amenities.controller';
import { BookingsModule } from '@/modules/bookings/bookings.module';
import { CourtsModule } from '@/modules/courts/courts.module';
import { InventoryModule } from '@/modules/inventory/inventory.module';
import { HealthController } from '@/modules/health/health.controller';
import { IdentitiesController } from '@/modules/identities/identities.controller';
import { SchedulerModule } from '@/modules/scheduler/scheduler.module';
import { SeriesModule } from '@/modules/series/series.module';
import { VenuesModule } from '@/modules/venues/venues.module';
import { WaitlistModule } from '@/modules/waitlist/waitlist.module';

@Module({
  imports: [CourtsModule, BookingsModule, SeriesModule, WaitlistModule, VenuesModule, InventoryModule, SchedulerModule],
  controllers: [HealthController, IdentitiesController, AmenitiesController],
  providers: [
    // Registered last in the chain by construction: a global filter sees errors thrown by
    // every guard, pipe, controller and service beneath it.
    { provide: APP_FILTER, useClass: DomainErrorFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // First thing to run, so every later log line — including the error filter's — carries
    // the same request id.
    consumer.apply(RequestContextMiddleware).forRoutes('*path');
  }
}
