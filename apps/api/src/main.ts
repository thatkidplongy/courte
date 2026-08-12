import 'reflect-metadata';
// Loads .env.local before any module that reads process.env is required. Keep it first.
import '@/loadEnv';

import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

import { AppModule } from '@/app.module';
import { env, isProduction } from '@/config/env';
import { API_VERSION_PREFIX, SHUTDOWN_TIMEOUT_MS } from '@/consts';
import { closePool } from '@/db/client';
import { logger } from '@/lib/logger';

/**
 * Middleware order is deliberate: CORS rejects a disallowed origin before any work is done,
 * security headers go on everything, then the app's own request-context middleware, guards
 * and pipes, with the global error filter seeing whatever falls out of all of it.
 */
const bootstrap = async (): Promise<void> => {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true, logger: false });

  // Behind a proxy the client IP arrives in X-Forwarded-For; without this every request looks
  // like it came from the load balancer, which would break per-IP rate limiting later.
  app.set('trust proxy', 1);

  app.enableCors({
    origin: env.WEB_ORIGINS,
    credentials: false,
    allowedHeaders: ['authorization', 'content-type', 'x-request-id', 'x-service-key'],
    exposedHeaders: ['x-request-id'],
  });
  app.use(helmet());

  // Health sits outside the version prefix: an orchestrator probing liveness should not have
  // to know which API version is current.
  app.setGlobalPrefix(API_VERSION_PREFIX, { exclude: ['health'] });

  if (!isProduction) {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('Courte API')
        .setDescription('Court booking — holds, series, waitlist and venue desk operations.')
        .setVersion('1.0')
        .addBearerAuth()
        .build()
    );
    SwaggerModule.setup('docs', app, document);
  }

  // Nest stops accepting connections and drains in-flight requests on SIGTERM/SIGINT; the
  // pool is released after that, in reverse order of acquisition.
  app.enableShutdownHooks();

  await app.listen(env.PORT);
  logger.info({ port: env.PORT, env: env.NODE_ENV }, 'courte api listening');
};

const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
  logger.info({ signal }, 'shutdown signal received');

  const timer = setTimeout(() => {
    logger.fatal({ timeoutMs: SHUTDOWN_TIMEOUT_MS }, 'shutdown timed out, exiting anyway');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  timer.unref();

  try {
    await closePool();
    logger.info('server exited properly');
    process.exit(0);
  } catch (error) {
    logger.error({ err: error }, 'shutdown failed');
    process.exit(1);
  }
};

process.once('SIGTERM', signal => void shutdown(signal));
process.once('SIGINT', signal => void shutdown(signal));

bootstrap().catch(error => {
  // A process that cannot boot must die loudly rather than sit there half-configured.
  logger.fatal({ err: error }, 'failed to start');
  process.exit(1);
});
