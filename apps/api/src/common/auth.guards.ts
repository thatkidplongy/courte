import { CanActivate, Injectable, UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { jwtVerify } from 'jose';

import { env } from '@/config/env';

const BEARER_PREFIX = 'Bearer ';
const SERVICE_KEY_HEADER = 'x-service-key';

const jwtSecret = new TextEncoder().encode(env.API_JWT_SECRET);

/**
 * Verifies the short-lived token the web app mints per call and puts the user id into request
 * context. The acting user is only ever taken from a verified signature — never from a body
 * field or a header the caller controls.
 *
 * Roles are deliberately not in the token. Venue membership is read from the database per
 * request (see VenueAccessService), so revoking a staff member takes effect immediately
 * instead of waiting for a token to expire.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const header = request.header('authorization');

    if (!header?.startsWith(BEARER_PREFIX)) throw new UnauthorizedException('Missing bearer token');

    try {
      const { payload } = await jwtVerify(header.slice(BEARER_PREFIX.length), jwtSecret, {
        issuer: 'courte-web',
        audience: 'courte-api',
      });

      if (typeof payload.sub !== 'string') throw new UnauthorizedException('Token carries no subject');

      // `sub` is a string by RFC 7519 whatever it identifies, so the user id is parsed here
      // rather than trusted. A token whose subject is not a positive integer cannot name a
      // user in this schema, and is rejected as firmly as a forged signature.
      const userId = Number(payload.sub);
      if (!Number.isSafeInteger(userId) || userId <= 0) {
        throw new UnauthorizedException('Token subject is not a user id');
      }

      request.context.userId = userId;
      request.log = request.log.child({ userId });
      return true;
    } catch {
      // One generic message: which part failed is not the caller's business.
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}

/**
 * Machine-to-machine gate for the identity endpoint, which runs before any user token exists
 * and so cannot be protected by one.
 */
@Injectable()
export class ServiceKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const presented = request.header(SERVICE_KEY_HEADER);

    if (!presented || !timingSafeEquals(presented, env.API_SERVICE_KEY)) {
      throw new UnauthorizedException('Invalid service key');
    }

    return true;
  }
}

/**
 * Constant-time comparison. A plain `===` leaks the shared secret's prefix through response
 * timing to anyone willing to send enough requests.
 */
const timingSafeEquals = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;

  let difference = 0;
  for (let index = 0; index < a.length; index += 1) {
    difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return difference === 0;
};
