import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

import { authConfig } from '@/auth.config';
import { isProduction } from '@/config/env';
import { upsertIdentity } from '@/lib/api/resources';

/**
 * Central auth per the frontend standards: one module exports { handlers, auth, signIn,
 * signOut }; RSCs and server actions call auth(), the catch-all route re-exports handlers.
 *
 * Deliberately no database adapter, and after ADR 0004 no database at all. Google is an
 * identity source, not our user store: on sign-in the API resolves the verified email into
 * our own users row and returns our uuid, which is what goes in the token. The session
 * carries identity only — venue memberships are read per request by the API, so revoking
 * staff access never waits for a token to expire.
 */

/**
 * Development-only sign-in: any email, no password, via /api/auth/signin. Exists so the
 * booking flow is testable before the client's Google OAuth credentials exist. Never
 * registered in production — the provider list below is gated, and signIn() rejects it
 * again as defense in depth.
 */
const devSignIn = Credentials({
  id: 'dev',
  name: 'Dev sign-in (any email)',
  credentials: { email: { label: 'Email' } },
  authorize: credentials => {
    const email = typeof credentials?.email === 'string' && credentials.email.includes('@') ? credentials.email : null;
    if (!email) return null;
    return { email, name: email.split('@')[0] ?? 'Dev user' };
  },
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: isProduction ? authConfig.providers : [...authConfig.providers, devSignIn],
  callbacks: {
    ...authConfig.callbacks,
    signIn({ account, profile }) {
      if (account?.provider === 'dev') return !isProduction;
      if (account?.provider !== 'google') return false;
      // An unverified Google email can be claimed by someone who does not control it.
      return profile?.email_verified === true;
    },
    async jwt({ token, account, profile, user }) {
      // account is only present on the sign-in request itself; every subsequent request
      // reuses the token without touching the database.
      const email = account?.provider === 'google' ? profile?.email : account?.provider === 'dev' ? user?.email : null;

      if (account && email) {
        const identity = await upsertIdentity(
          email,
          (account.provider === 'google' ? profile?.name : user?.name) ?? email
        );
        token.userId = identity.userId;
      }
      return token;
    },
    session({ session, token }) {
      if (typeof token.userId === 'string') session.user.id = token.userId;
      return session;
    },
  },
});
