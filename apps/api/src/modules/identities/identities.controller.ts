import { Body, Controller, Post, UseGuards } from '@nestjs/common';

import { upsertIdentityBodySchema, type UpsertIdentityBody, type UpsertIdentityResponse } from '@courte/contract';

import { ServiceKeyGuard } from '@/common/auth.guards';
import { validateWith } from '@/common/zodValidation.pipe';
import { upsertUserFromOAuth } from '@/db/repositories/userRepository';

/**
 * The one endpoint a user token cannot protect, because it runs during sign-in before a
 * token exists. Guarded by the shared service key instead, and reachable only from the web
 * app's server-side callback — never from a browser.
 *
 * Google remains an identity source, not our user store: this maps a verified email onto our
 * own users row and returns our uuid, which is what ends up in the session token.
 */
@Controller('identities')
@UseGuards(ServiceKeyGuard)
export class IdentitiesController {
  @Post()
  async upsertIdentity(
    @Body(validateWith(upsertIdentityBodySchema)) body: UpsertIdentityBody
  ): Promise<UpsertIdentityResponse> {
    const userId = await upsertUserFromOAuth({ email: body.email, name: body.name });
    return { userId };
  }
}
