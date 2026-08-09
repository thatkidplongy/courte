import { NextResponse } from 'next/server';

import { expireLapsedOffers } from '@/db/repositories/waitlistRepository';
import { requireJobSecret } from '@/lib/http/requireJobSecret';
import { logger } from '@/lib/logger';

export const POST = async (request: Request): Promise<NextResponse> => {
  const denied = requireJobSecret(request);
  if (denied) return denied;

  try {
    const expired = await expireLapsedOffers();
    if (expired > 0) logger.info({ expired }, 'lapsed waitlist offers returned to queue');
    return NextResponse.json({ expired });
  } catch (error) {
    logger.error({ err: error }, 'offer expiry failed');
    return NextResponse.json({ code: 'JOB_FAILED', message: 'Offer expiry failed' }, { status: 500 });
  }
};
