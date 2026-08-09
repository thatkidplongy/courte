import { z } from 'zod';

/**
 * Config is validated once, at boot. An invalid value crashes the process before it serves a
 * single request, which with blue-green deploys leaves the previous version running rather
 * than shipping something that fails on the first user.
 */

const postgresUrl = z
  .string()
  .min(1)
  .refine(value => value.startsWith('postgres://') || value.startsWith('postgresql://'), {
    message: 'must be a postgres:// or postgresql:// connection string',
  });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  DATABASE_URL: postgresUrl,
  DATABASE_POOL_MAX: z.coerce.number().int().positive().max(100).default(10),

  AUTH_SECRET: z.string().min(32, 'generate one with: openssl rand -base64 32'),
  AUTH_GOOGLE_ID: z.string().min(1, 'OAuth client id from Google Cloud Console'),
  AUTH_GOOGLE_SECRET: z.string().min(1, 'OAuth client secret from Google Cloud Console'),

  HOLD_TTL_MINUTES: z.coerce.number().int().positive().max(60).default(10),
  RECURRENCE_HORIZON_DAYS: z.coerce.number().int().positive().max(730).default(365),
  WAITLIST_CLAIM_MINUTES: z.coerce.number().int().positive().max(1440).default(30),

  JOB_TRIGGER_SECRET: z.string().min(16),

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
