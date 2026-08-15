import type { DefaultSession } from 'next-auth';

/**
 * Module augmentation, so the import above is load-bearing: without a real import of
 * 'next-auth' this file would declare a brand-new ambient module rather than extend theirs.
 */
declare module 'next-auth' {
  interface Session {
    /**
     * Our own "User".id, as an integer.
     *
     * Named for the app rather than called `id` or `userId`, because Auth.js already owns
     * both: `User.id` and `AdapterSession.userId` are declared as strings, and the session
     * callback's parameter is a union that includes `AdapterSession`. Redeclaring either as a
     * number intersects to `never` — a genuinely confusing error for what looks like a
     * straightforward augmentation. A distinct name says whose id this is and cannot collide.
     */
    courteUserId: number;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    courteUserId?: number;
  }
}

export type { DefaultSession };
