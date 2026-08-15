import { z } from 'zod';

/**
 * Service-to-service only. The web app's Auth.js sign-in callback used to write to the users
 * table directly; after the split it asks the API to resolve an identity instead, so the API
 * remains the only process holding a database connection.
 */
export const upsertIdentityBodySchema = z.object({
  email: z.email().max(320),
  name: z.string().trim().min(1).max(200),
});

export type UpsertIdentityBody = z.infer<typeof upsertIdentityBodySchema>;

export type UpsertIdentityResponse = {
  userId: number;
};
