import { Catch, HttpException, HttpStatus, type ArgumentsHost, type ExceptionFilter } from '@nestjs/common';
import type { ApiErrorBody } from '@courte/contract';
import type { Request, Response } from 'express';

import { DomainError, ERROR_CODES, type ErrorCode } from '@/domain/errors';
import { logger } from '@/lib/logger';

/**
 * The last link in the chain and the only place error-to-HTTP mapping lives. Repositories and
 * services throw domain errors that know nothing about status codes; this maps them once.
 *
 * NOT_FOUND covers both "no such row" and "not yours" — see NotFoundError. Returning 403 for
 * the second would tell an attacker their guessed id was real.
 */
const STATUS_BY_CODE: Record<ErrorCode, HttpStatus> = {
  [ERROR_CODES.VALIDATION_FAILED]: HttpStatus.BAD_REQUEST,
  [ERROR_CODES.NOT_FOUND]: HttpStatus.NOT_FOUND,
  [ERROR_CODES.SLOT_UNAVAILABLE]: HttpStatus.CONFLICT,
  [ERROR_CODES.OUTSIDE_OPENING_HOURS]: HttpStatus.BAD_REQUEST,
  [ERROR_CODES.INVALID_DURATION]: HttpStatus.BAD_REQUEST,
  [ERROR_CODES.HOLD_EXPIRED]: HttpStatus.CONFLICT,
  [ERROR_CODES.CANCELLATION_WINDOW_PASSED]: HttpStatus.CONFLICT,
  [ERROR_CODES.NOT_PERMITTED]: HttpStatus.FORBIDDEN,
};

const UNEXPECTED: ApiErrorBody = {
  code: 'INTERNAL_ERROR',
  message: 'Something went wrong',
};

@Catch()
export class DomainErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<Request>();
    const log = request.log ?? logger;

    if (exception instanceof DomainError) {
      const status = STATUS_BY_CODE[exception.code];
      const body: ApiErrorBody = {
        code: exception.code,
        message: exception.message,
        ...(exception.fieldErrors.length > 0 ? { errors: exception.fieldErrors } : {}),
      };

      // Expected outcomes, not faults: a lost race and a stale hold are both normal traffic.
      log.info({ code: exception.code, status }, 'request rejected');
      response.status(status).json(body);
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body: ApiErrorBody = { code: `HTTP_${status}`, message: exception.message };
      log.warn({ status }, 'request failed');
      response.status(status).json(body);
      return;
    }

    // Nothing from an unexpected error reaches the client — no driver text, no table names,
    // no stack. The detail goes to the log, keyed by the request id the caller already has.
    log.error({ err: exception }, 'unhandled error');
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(UNEXPECTED);
  }
}
