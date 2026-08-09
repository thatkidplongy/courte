import { NextResponse } from 'next/server';

import { extendHorizons } from '@/jobs/extendHorizons';
import { requireJobSecret } from '@/lib/http/requireJobSecret';
import { logger } from '@/lib/logger';

export const POST = async (request: Request): Promise<NextResponse> => {
  const denied = requireJobSecret(request);
  if (denied) return denied;

  try {
    const result = await extendHorizons();
    return NextResponse.json(result);
  } catch (error) {
    logger.error({ err: error }, 'horizon extension failed');
    return NextResponse.json({ code: 'JOB_FAILED', message: 'Horizon extension failed' }, { status: 500 });
  }
};
