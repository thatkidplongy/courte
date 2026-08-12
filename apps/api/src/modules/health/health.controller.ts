import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';

import { query } from '@/db/client';
import { logger } from '@/lib/logger';

type HealthResponse = {
  status: 'ok';
  database: 'ok';
};

/**
 * Liveness alone is a lie — a process that answers while its database is unreachable will
 * happily keep taking traffic. This runs a real query, so a load balancer drains this
 * instance instead of routing bookings at it.
 */
@Controller('health')
export class HealthController {
  @Get()
  async check(): Promise<HealthResponse> {
    try {
      await query('SELECT 1');
      return { status: 'ok', database: 'ok' };
    } catch (error) {
      logger.error({ err: error }, 'health check failed');
      throw new ServiceUnavailableException('Database unreachable');
    }
  }
}
