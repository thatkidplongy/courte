import { z } from 'zod';

/**
 * Config is validated once, at boot. An invalid value crashes the process before it serves a
 * single request, which with blue-green deploys leaves the previous version running rather
 * than shipping something that fails on the first user.
 *
 * Google OAuth credentials are deliberately absent: identity is the web app's concern now.
 * The API only needs the secret it verifies the resulting tokens with.
 */

const postgresUrl = z
  .string()
  .min(1)
  .refine(value => value.startsWith('postgres://') || value.startsWith('postgresql://'), {
    message: 'must be a postgres:// or postgresql:// connection string',
  });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().max(65_535).default(4000),

  DATABASE_URL: postgresUrl,
  DATABASE_POOL_MAX: z.coerce.number().int().positive().max(100).default(10),

  /**
   * Shared with the web app, which signs the short-lived caller tokens this process verifies
   * on every request. Rotating it invalidates every token in flight, which is the point.
   */
  API_JWT_SECRET: z.string().min(32, 'generate one with: openssl rand -base64 32'),

  /**
   * Service-to-service credential for the identity endpoint. Not a user token — it is how the
   * web app's sign-in callback resolves a Google identity into our own user id without
   * holding a database connection.
   */
  API_SERVICE_KEY: z.string().min(32, 'generate one with: openssl rand -base64 32'),

  /** Comma-separated allowlist. CORS rejects everything else before any work is done. */
  WEB_ORIGINS: z
    .string()
    .default('http://localhost:3000')
    .transform(value =>
      value
        .split(',')
        .map(origin => origin.trim())
        .filter(Boolean)
    ),

  HOLD_TTL_MINUTES: z.coerce.number().int().positive().max(60).default(10),
  RECURRENCE_HORIZON_DAYS: z.coerce.number().int().positive().max(730).default(365),
  WAITLIST_CLAIM_MINUTES: z.coerce.number().int().positive().max(1440).default(30),

  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error', 'fatal']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

const parseEnv = (): Env => {
  const result = envSchema.safeParse(process.env);
  if (result.success) return result.data;

  const details = result.error.issues
    .map(issue => `  ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n');

  // Thrown, not logged-and-continued: a half-configured process is worse than a dead one.
  throw new Error(`Invalid environment configuration:\n${details}\n\nSee .env.example.`);
};

export const env = parseEnv();

export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
