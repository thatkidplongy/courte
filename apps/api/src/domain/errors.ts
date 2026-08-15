/**
 * Domain errors know nothing about HTTP. Mapping them onto status codes happens once, in
 * `src/common/domainError.filter.ts`, so no service or repository ever reaches for a status.
 */

export const ERROR_CODES = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  NOT_FOUND: 'NOT_FOUND',
  SLOT_UNAVAILABLE: 'SLOT_UNAVAILABLE',
  OUTSIDE_OPENING_HOURS: 'OUTSIDE_OPENING_HOURS',
  INVALID_DURATION: 'INVALID_DURATION',
  HOLD_EXPIRED: 'HOLD_EXPIRED',
  CANCELLATION_WINDOW_PASSED: 'CANCELLATION_WINDOW_PASSED',
  NOT_PERMITTED: 'NOT_PERMITTED',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export type FieldError = {
  field: string;
  message: string;
};

export class DomainError extends Error {
  readonly code: ErrorCode;
  readonly fieldErrors: FieldError[];

  constructor(code: ErrorCode, message: string, fieldErrors: FieldError[] = []) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, fieldErrors: FieldError[] = []) {
    super(ERROR_CODES.VALIDATION_FAILED, message, fieldErrors);
  }
}

/**
 * Also raised when a record exists but belongs to another user. Returning "not found" rather
 * than "forbidden" stops an attacker distinguishing a real ID from a fabricated one.
 */
export class NotFoundError extends DomainError {
  constructor(entity: string) {
    super(ERROR_CODES.NOT_FOUND, `${entity} not found`);
  }
}

export class SlotUnavailableError extends DomainError {
  constructor(message = 'That slot has just been taken') {
    super(ERROR_CODES.SLOT_UNAVAILABLE, message);
  }
}

export class OutsideOpeningHoursError extends DomainError {
  constructor(message = 'The court is not open for the whole of that period') {
    super(ERROR_CODES.OUTSIDE_OPENING_HOURS, message);
  }
}

export class InvalidDurationError extends DomainError {
  constructor(message: string) {
    super(ERROR_CODES.INVALID_DURATION, message);
  }
}

export class HoldExpiredError extends DomainError {
  constructor(message = 'Your hold expired before checkout completed') {
    super(ERROR_CODES.HOLD_EXPIRED, message);
  }
}

export class CancellationWindowPassedError extends DomainError {
  constructor(message = 'This booking is inside its cancellation window') {
    super(ERROR_CODES.CANCELLATION_WINDOW_PASSED, message);
  }
}

/**
 * A write lost a race to an identical one. Distinct from ValidationError because the caller did
 * nothing wrong — the same request a moment earlier would have succeeded.
 */
export class ConflictError extends DomainError {
  constructor(message: string) {
    super(ERROR_CODES.ALREADY_EXISTS, message);
  }
}

export class NotPermittedError extends DomainError {
  constructor(message = 'You do not have permission to do that') {
    super(ERROR_CODES.NOT_PERMITTED, message);
  }
}
