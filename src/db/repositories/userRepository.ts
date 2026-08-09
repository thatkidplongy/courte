import { query } from '@/db/client';

export type UpsertUserParams = {
  email: string;
  name: string;
};

/**
 * Called from the sign-in path only. Email is the join key to Google (citext, so case never
 * splits an identity); the returned id is OUR uuid, which is what goes into the session and
 * every FK — Google's subject id never leaks into the schema.
 */
export const upsertUserFromOAuth = async (params: UpsertUserParams): Promise<string> => {
  const rows = await query<{ id: string }>(
    `
    INSERT INTO users (email, name)
    VALUES ($1, $2)
    ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
    RETURNING id
    `,
    [params.email, params.name]
  );

  const id = rows[0]?.id;
  if (!id) throw new Error('user upsert returned no id');
  return id;
};
