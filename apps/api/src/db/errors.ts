import { PG_EXCLUSION_VIOLATION, PG_FOREIGN_KEY_VIOLATION, PG_UNIQUE_VIOLATION } from '@/consts';

type PostgresError = {
  code: string;
  constraint?: string;
};

const asPostgresError = (error: unknown): PostgresError | null => {
  if (typeof error !== 'object' || error === null) return null;

  const candidate = error as { code?: unknown; constraint?: unknown };
  if (typeof candidate.code !== 'string') return null;

  return {
    code: candidate.code,
    constraint: typeof candidate.constraint === 'string' ? candidate.constraint : undefined,
  };
};

/**
 * Raised by `reservation_no_overlap` when a range collides with an existing active
 * reservation. This is the expected outcome of a lost race, not a fault — the caller turns it
 * into "that slot has just been taken". See docs/adr/0002.
 */
export const isOverlapViolation = (error: unknown): boolean => asPostgresError(error)?.code === PG_EXCLUSION_VIOLATION;

export const isUniqueViolation = (error: unknown): boolean => asPostgresError(error)?.code === PG_UNIQUE_VIOLATION;

export const isForeignKeyViolation = (error: unknown): boolean =>
  asPostgresError(error)?.code === PG_FOREIGN_KEY_VIOLATION;

export const getViolatedConstraint = (error: unknown): string | undefined => asPostgresError(error)?.constraint;
