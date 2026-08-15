import type { NextConfig } from 'next';

/**
 * The app deliberately holds no database driver — it reaches Postgres only through
 * @courte/api over HTTP (ADR 0004), and an ESLint rule fails the build if that changes.
 *
 * Caching is still on Next's defaults. Turning on `cacheComponents` is the next step and is
 * not a one-line flag: it makes rendering dynamic-by-default with caching opt-in, so every
 * availability read needs its own Suspense boundary first. The templates are where those
 * boundaries will live.
 */
const nextConfig: NextConfig = {};

export default nextConfig;
