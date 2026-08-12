import { z } from 'zod';

import { DomainError, ValidationError } from '@/domain/errors';

/**
 * Postgres's uuid type accepts any well-formed hex uuid regardless of RFC 4122 version bits;
 * Zod v4's z.uuid() does not. z.guid() matches what the database actually accepts.
 */
export const idSchema = z.guid();

/** Field-level detail when there is any — 'Invalid input' alone helps nobody. */
export const formatDomainError = (error: DomainError): string => {
  if (error.fieldErrors.length === 0) return error.message;
  return error.fieldErrors.map(field => `${field.field}: ${field.message}`).join('; ');
};

/**
 * The one schema-driven validation gate (backend standards): every entry point — server
 * action or route — parses its input through here before any logic runs. A failure carries
 * per-field messages, aggregated, so the caller can render them next to the fields.
 */
export const parseInput = <Schema extends z.ZodType>(schema: Schema, input: unknown): z.infer<Schema> => {
  const result = schema.safeParse(input);
  if (result.success) return result.data;

  const fieldErrors = result.error.issues.map(issue => ({
    field: issue.path.join('.') || '(root)',
    message: issue.message,
  }));

  throw new ValidationError('Invalid input', fieldErrors);
};

/**
 * Path parameters are client input too. Without this a malformed id reaches Postgres and
 * comes back as a driver error, which the filter can only turn into a generic 500 — a 400
 * naming the parameter is both truthful and more useful.
 */
export const parseId = (value: string, field: string): string => {
  const result = idSchema.safeParse(value);
  if (result.success) return result.data;

  throw new ValidationError('Invalid input', [{ field, message: 'must be a uuid' }]);
};
