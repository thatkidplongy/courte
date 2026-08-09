import { NextResponse } from 'next/server';

import { env } from '@/config/env';

/**
 * Job routes are reachable from the public internet; Vercel Cron authenticates by sending
 * this bearer token. Anything else gets a 401 before any work runs.
 */
export const requireJobSecret = (request: Request): NextResponse | null => {
  const header = request.headers.get('authorization');
  if (header === `Bearer ${env.JOB_TRIGGER_SECRET}`) return null;

  return NextResponse.json({ code: 'UNAUTHENTICATED', message: 'Missing or invalid job credential' }, { status: 401 });
};
