import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';

/**
 * The edge-safe half of the auth setup: providers and gate logic only, no database imports.
 * proxy.ts consumes this directly, so route protection never pulls pg into the request-
 * interception path. The DB-touching callbacks live in src/auth.ts.
 *
 * Google() reads AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET by Auth.js convention; both are also
 * validated at boot by src/config/env.ts so a missing credential kills the process early
 * instead of failing on the first sign-in attempt.
 */
export const authConfig = {
  providers: [Google],
  session: { strategy: 'jwt' },
  callbacks: {
    signIn({ account, profile }) {
      if (account?.provider !== 'google') return false;
      // An unverified Google email can be claimed by someone who does not control it.
      return profile?.email_verified === true;
    },
    authorized({ auth }) {
      // Runs only on proxy.ts matcher routes; a false here redirects to sign-in with a
      // return URL. Venue-scoped authorization happens deeper (layout + server actions) —
      // this gate only answers "is anyone signed in at all?".
      return Boolean(auth?.user);
    },
  },
} satisfies NextAuthConfig;
