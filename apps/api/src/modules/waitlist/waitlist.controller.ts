import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { joinWaitlistBodySchema, type JoinWaitlistBody, type WaitlistEntry } from '@courte/contract';

import { JwtAuthGuard } from '@/common/auth.guards';
import { CurrentUserId } from '@/common/currentUser.decorator';
import { validateWith } from '@/common/zodValidation.pipe';

import { WaitlistService } from './waitlist.service';

@Controller('waitlist-entries')
@UseGuards(JwtAuthGuard)
export class WaitlistController {
  constructor(private readonly waitlist: WaitlistService) {}

  @Post()
  joinWaitlist(
    @CurrentUserId() userId: number,
    @Body(validateWith(joinWaitlistBodySchema)) body: JoinWaitlistBody
  ): Promise<{ entryId: number }> {
    return this.waitlist.joinWaitlist(userId, body);
  }

  /**
   * Unpaginated by design: an entry is short-lived and a player holds a handful at most, so
   * the list has a natural ceiling the pagination rule exists to guard against.
   */
  @Get()
  listEntries(@CurrentUserId() userId: number): Promise<WaitlistEntry[]> {
    return this.waitlist.listEntries(userId);
  }
}
