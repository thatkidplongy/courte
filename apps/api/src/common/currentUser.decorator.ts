import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

/**
 * The acting user id, from the verified token only. Controllers never accept a user id as a
 * parameter — that is the whole reason this decorator exists rather than a body field.
 *
 * Safe to assert: every route using it sits behind JwtAuthGuard, which throws before the
 * handler runs if the token is missing or invalid.
 */
export const CurrentUserId = createParamDecorator((_data: unknown, context: ExecutionContext): number => {
  const request = context.switchToHttp().getRequest<Request>();
  const userId = request.context.userId;
  if (!userId) throw new Error('CurrentUserId used on a route that is not behind JwtAuthGuard');
  return userId;
});
