import pino from 'pino';

import { env, isProduction } from '@/config/env';

/**
 * Pretty console output in development, JSON in production so log tooling can index fields.
 * Never log emails, phone numbers or payment references — user IDs and request IDs carry
 * enough context to reconstruct a session without putting PII in a log aggregator.
 */
export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: ['email', '*.email', 'phone', '*.phone', 'password', '*.password', 'externalRef', '*.externalRef'],
    remove: true,
  },
  ...(isProduction ? {} : { transport: { target: 'pino-pretty', options: { colorize: true } } }),
});

export type RequestContext = {
  requestId: string;
  /** Populated by JwtAuthGuard. Absent on public routes; never read from a request body. */
  userId?: number;
};

export const createRequestLogger = (context: RequestContext) => logger.child(context);
