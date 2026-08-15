import { z } from 'zod';

import { idSchema } from '@courte/contract';

import { DomainError, ValidationError } from '@/domain/errors';

export { idSchema };

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
 * Path parameters are client input too, and they arrive as strings whatever they identify.
 * This is the one place a URL segment becomes an id: it coerces and validates in a single
 * step, so nothing downstream has to wonder whether it holds `'3'` or `3`.
 *
 * Without it a malformed id reaches Postgres and comes back as a driver error, which the
 * filter can only turn into a generic 500 — a 400 naming the parameter is both truthful and
 * more useful. That matters more with integer keys than it did with uuids: `/courts/abc` is
 * now a far likelier typo than a malformed uuid ever was.
 */
export const parseId = (value: string, field: string): number => {
  const result = idSchema.safeParse(value);
  if (result.success) return result.data;

  throw new ValidationError('Invalid input', [{ field, message: 'must be a positive whole number' }]);
};
