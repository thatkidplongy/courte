import { randomUUID } from 'node:crypto';

import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

import { createRequestLogger, type RequestContext } from '@/lib/logger';

declare module 'express' {
  interface Request {
    context: RequestContext;
    log: ReturnType<typeof createRequestLogger>;
  }
}

const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Runs before everything else so every later log line, including the error filter's, can
 * carry the same id. An inbound `x-request-id` is honoured so a trace survives the hop from
 * the web app; otherwise we mint one. It goes back out on the response either way.
 */
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction): void {
    const inbound = request.header(REQUEST_ID_HEADER);
    const requestId = inbound && inbound.length <= 128 ? inbound : randomUUID();

    request.context = { requestId };
    request.log = createRequestLogger({ requestId });
    response.setHeader(REQUEST_ID_HEADER, requestId);

    next();
  }
}
