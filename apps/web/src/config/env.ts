import { z } from 'zod';

/**
 * Validated once, at boot, so a half-configured deploy dies before serving anyone.
 *
 * There is no DATABASE_URL here and there should never be one: after ADR 0004 the web app
 * reaches Postgres only through @courte/api. The two shared secrets below are the entire
 * surface of that relationship.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  AUTH_SECRET: z.string().min(32, 'generate one with: openssl rand -base64 32'),
  AUTH_GOOGLE_ID: z.string().min(1, 'OAuth client id from Google Cloud Console'),
  AUTH_GOOGLE_SECRET: z.string().min(1, 'OAuth client secret from Google Cloud Console'),

  API_BASE_URL: z.url().default('http://localhost:4000'),

  /** Signs the short-lived caller tokens the API verifies. Must match the API's copy. */
  API_JWT_SECRET: z.string().min(32, 'generate one with: openssl rand -base64 32'),

  /** Service-to-service credential for the identity endpoint used during sign-in. */
  API_SERVICE_KEY: z.string().min(32, 'generate one with: openssl rand -base64 32'),
});

export type Env = z.infer<typeof envSchema>;

const parseEnv = (): Env => {
  const result = envSchema.safeParse(process.env);
  if (result.success) return result.data;

  const details = result.error.issues
    .map(issue => `  ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n');

  throw new Error(`Invalid environment configuration:\n${details}\n\nSee .env.example.`);
};

export const env = parseEnv();

export const isProduction = env.NODE_ENV === 'production';
