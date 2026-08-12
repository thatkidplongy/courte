import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { expireLapsedOffers } from '@/db/repositories/waitlistRepository';
import { extendHorizons } from '@/jobs/extendHorizons';
import { sweepHolds } from '@/jobs/sweepHolds';
import { logger } from '@/lib/logger';

/**
 * The jobs run inside this process now. As Vercel Cron route handlers they needed a shared
 * secret, an HTTP round trip and a paid plan for minute-level granularity; a long-lived
 * service just schedules them.
 *
 * Every job is idempotent — releases are state-guarded updates, offers only touch rows still
 * waiting, occurrence inserts are unique-indexed — so an overlapping or repeated run is
 * harmless. Each guards its own failure so one throwing never stops the others being
 * scheduled again.
 */
@Injectable()
export class SchedulerService {
  private running = new Set<string>();

  @Cron(CronExpression.EVERY_MINUTE, { name: 'sweep-holds' })
  async sweepHolds(): Promise<void> {
    await this.runExclusively('sweep-holds', sweepHolds);
  }

  @Cron(CronExpression.EVERY_5_MINUTES, { name: 'expire-offers' })
  async expireOffers(): Promise<void> {
    await this.runExclusively('expire-offers', async () => {
      const expired = await expireLapsedOffers();
      if (expired > 0) logger.info({ expired }, 'lapsed waitlist offers returned to queue');
      return { expired };
    });
  }

  @Cron('0 3 * * *', { name: 'extend-horizons' })
  async extendHorizons(): Promise<void> {
    await this.runExclusively('extend-horizons', extendHorizons);
  }

  /**
   * A slow run must not stack on top of itself. The jobs tolerate concurrency, but a backlog
   * of overlapping sweeps competing for the same rows wastes connections for no gain.
   */
  private async runExclusively(name: string, job: () => Promise<unknown>): Promise<void> {
    if (this.running.has(name)) {
      logger.warn({ job: name }, 'previous run still in flight, skipping this tick');
      return;
    }

    this.running.add(name);
    try {
      await job();
    } catch (error) {
      logger.error({ err: error, job: name }, 'scheduled job failed');
    } finally {
      this.running.delete(name);
    }
  }
}
