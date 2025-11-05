import { NextRequest, NextResponse } from 'next/server';
import { checkDemoRateLimit, getClientIp } from '@/lib/demo-rate-limit';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const clientIp = getClientIp(request.headers);
    const rateLimitResult = await checkDemoRateLimit(clientIp);

    return NextResponse.json({
      allowed: rateLimitResult.allowed,
      remaining: rateLimitResult.remaining,
      resetDate: rateLimitResult.resetDate,
    });
  } catch (error) {
    console.error('Rate limit check error:', error);
    return NextResponse.json(
      {
        error: 'CHECK_FAILED',
        message: 'Failed to check rate limit',
      },
      { status: 500 }
    );
  }
}
