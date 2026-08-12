import { z } from 'zod';

import { DEFAULT_LIMIT, DEFAULT_PAGE, MAX_LIMIT } from './consts';

export const idSchema = z.guid();

/** ISO-8601 with an explicit offset. Naive local times are rejected at the edge, not guessed at. */
export const isoDateTimeSchema = z.iso.datetime({ offset: true });

/** Calendar day in the venue's zone, e.g. 2026-08-12. */
export const isoDateSchema = z.iso.date();

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(DEFAULT_PAGE),
  limit: z.coerce.number().int().positive().max(MAX_LIMIT).default(DEFAULT_LIMIT),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

/**
 * Every list endpoint returns this shape, including when it matches nothing — an empty
 * search is a 200 with `data: []`, never a 404.
 */
export type Paginated<T> = {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
};

export type FieldError = {
  field: string;
  message: string;
};

/**
 * The single error shape for the whole API. `errors` carries per-field detail for validation
 * failures; everything else leaves it absent.
 */
export type ApiErrorBody = {
  code: string;
  message: string;
  errors?: FieldError[];
};
