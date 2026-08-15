import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { createSeriesBodySchema, type CreateSeriesBody, type CreateSeriesResponse } from '@courte/contract';

import { JwtAuthGuard } from '@/common/auth.guards';
import { CurrentUserId } from '@/common/currentUser.decorator';
import { validateWith } from '@/common/zodValidation.pipe';

import { SeriesService } from './series.service';

@Controller('series')
@UseGuards(JwtAuthGuard)
export class SeriesController {
  constructor(private readonly series: SeriesService) {}

  /**
   * 201 even when some weeks clashed: the series resource was created, and the conflicts are
   * part of its representation rather than a failure.
   */
  @Post()
  createSeries(
    @CurrentUserId() userId: number,
    @Body(validateWith(createSeriesBodySchema)) body: CreateSeriesBody
  ): Promise<CreateSeriesResponse> {
    return this.series.createSeries(userId, body);
  }
}
