import { Pool, types, type PoolClient, type QueryResultRow } from 'pg';

import { env, isProduction } from '@/config/env';
import { logger } from '@/lib/logger';

/**
 * `pg` hands back int8 as a STRING, and it is right to by default: bigint's range is wider than
 * JS can hold, so parsing blindly would silently corrupt a large value. Every primary key in
 * this schema is int8, so without this every id would arrive as '1' and compare unequal to 1.
 *
 * Parsing to a number is safe here because the contract's `idSchema` caps ids at
 * MAX_SAFE_INTEGER, and nothing in this schema stores a bigint that is not an id. If a genuine
 * big number column is ever added — a cursor, a byte count — it must be read as text and
 * handled explicitly rather than relying on this.
 */
types.setTypeParser(types.builtins.INT8, value => Number(value));

/**
 * One pool for the process, never a connection per request. Next re-evaluates modules on hot
 * reload, so in development the pool is parked on globalThis — otherwise every save leaks a
 * pool and the database hits its connection cap within a few minutes of editing.
 */
const globalForDb = globalThis as unknown as { courtePool?: Pool };

export const pool =
  globalForDb.courtePool ??
  new Pool({
    connectionString: env.DATABASE_URL,
    max: env.DATABASE_POOL_MAX,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

if (!isProduction) globalForDb.courtePool = pool;

pool.on('error', error => {
  // An idle client failing is not tied to any request, so it has no request logger to attach to.
  logger.error({ err: error }, 'idle database client errored');
});

const SLOW_QUERY_MS = 200;

export const query = async <T extends QueryResultRow>(text: string, params: unknown[] = []): Promise<T[]> => {
  const startedAt = performance.now();
  const result = await pool.query<T>(text, params);
  const durationMs = Math.round(performance.now() - startedAt);

  if (durationMs > SLOW_QUERY_MS) {
    logger.warn({ durationMs, rowCount: result.rowCount }, 'slow query');
  }

  return result.rows;
};

/**
 * Wraps writes that must land as a unit — the canonical case being a booking that inserts one
 * reservation per court, where a single overlap has to abort every other court too.
 */
export const withTransaction = async <T>(run: (client: PoolClient) => Promise<T>): Promise<T> => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await run(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const closePool = async (): Promise<void> => {
  logger.info('closing database pool');
  await pool.end();
};

/**
 * Signal handling deliberately lives in main.ts, not here. Resources are released in reverse
 * order of acquisition — HTTP server first, then this pool — and only the bootstrap knows
 * that order. A module that closes the process out from under an in-flight request is worse
 * than no graceful shutdown at all.
 */
