import { NextResponse } from 'next/server';

import { sweepHolds } from '@/jobs/sweepHolds';
import { requireJobSecret } from '@/lib/http/requireJobSecret';
import { logger } from '@/lib/logger';

export const POST = async (request: Request): Promise<NextResponse> => {
  const denied = requireJobSecret(request);
  if (denied) return denied;

  try {
    const result = await sweepHolds();
    return NextResponse.json(result);
  } catch (error) {
    logger.error({ err: error }, 'hold sweep failed');
    return NextResponse.json({ code: 'JOB_FAILED', message: 'Hold sweep failed' }, { status: 500 });
  }
};
