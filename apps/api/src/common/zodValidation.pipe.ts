import { Injectable, type PipeTransform } from '@nestjs/common';
import type { z } from 'zod';

import { parseInput } from '@/lib/validation';

/**
 * Validation and transformation run at the entry point, before any controller body executes,
 * through one schema-driven pipeline rather than ad-hoc per-endpoint checks. A failure throws
 * ValidationError carrying per-field messages; the global filter turns that into a 400.
 *
 * Transformation is part of the same pass: query strings arrive as strings and leave as the
 * numbers, dates and enums the schema declares, so nothing downstream re-parses.
 */
@Injectable()
export class ZodValidationPipe<Schema extends z.ZodType> implements PipeTransform<unknown, z.infer<Schema>> {
  constructor(private readonly schema: Schema) {}

  transform(value: unknown): z.infer<Schema> {
    return parseInput(this.schema, value);
  }
}

/** Reads better at the call site than `new ZodValidationPipe(schema)` inside a decorator. */
export const validateWith = <Schema extends z.ZodType>(schema: Schema): ZodValidationPipe<Schema> =>
  new ZodValidationPipe(schema);
