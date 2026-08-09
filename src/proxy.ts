import NextAuth from 'next-auth';

import { authConfig } from '@/auth.config';

/**
 * Request interception (Next 16's proxy.ts, the middleware.ts successor). Built from the
 * edge-safe config half only — no database imports on this path.
 *
 * First gate of three: unauthenticated users on matcher routes bounce to sign-in with a
 * return URL. The venue-membership gate (layout) and the per-action re-check are deeper in.
 */
export default NextAuth(authConfig).auth;

export const config = {
  matcher: ['/bookings/:path*', '/manage/:path*'],
};
