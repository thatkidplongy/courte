import { Injectable } from '@nestjs/common';
import type { CreateSeriesBody, CreateSeriesResponse } from '@courte/contract';

import { env } from '@/config/env';
import { findCourtById } from '@/db/repositories/courtRepository';
import { findSeriesById, insertSeries } from '@/db/repositories/seriesRepository';
import { findVenueTimezones } from '@/db/repositories/venueRepository';
import { assertDurationAllowed } from '@/domain/booking/durationPolicy';
import { NotFoundError } from '@/domain/errors';
import { materialiseOneSeries } from '@/jobs/extendHorizons';

@Injectable()
export class SeriesService {
  /**
   * "Every week at this time, for N weeks" — the recurring booking. No hold dance:
   * occurrences insert one transaction each, clear weeks book, clashing weeks are reported
   * back by timestamp. Same behaviour a series edit in a calendar app has, because failing a
   * whole season over one busy week is useless.
   */
  async createSeries(userId: number, body: CreateSeriesBody): Promise<CreateSeriesResponse> {
    const court = await findCourtById(body.courtId);
    if (!court) throw new NotFoundError('Court');
    assertDurationAllowed(court, body.durationMinutes);

    const timezone = (await findVenueTimezones([court.venueId])).get(court.venueId);
    if (!timezone) throw new NotFoundError('Venue');

    const seriesId = await insertSeries({
      createdBy: userId,
      venueId: court.venueId,
      rrule: `FREQ=WEEKLY;COUNT=${body.weeks}`,
      timezone,
      dtstart: new Date(body.startIso),
      durationMinutes: body.durationMinutes,
      source: 'online',
      courtIds: [court.id],
    });

    const series = await findSeriesById(seriesId);
    if (!series) throw new NotFoundError('Series');

    const horizon = new Date(Date.now() + env.RECURRENCE_HORIZON_DAYS * 86_400_000);
    const result = await materialiseOneSeries(series, horizon);

    return {
      seriesId,
      created: result.created.length,
      requested: body.weeks,
      conflictIsos: result.conflicts.map(date => date.toISOString()),
      timezone,
    };
  }
}
