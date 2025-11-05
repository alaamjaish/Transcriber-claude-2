import { NextRequest, NextResponse } from 'next/server';
import { generateDemoSummary } from '@/lib/ai/demo-generate';
import { incrementDemoTrialCount, getClientIp } from '@/lib/demo-rate-limit';

export const runtime = 'nodejs';
export const maxDuration = 60; // 1 minute max for summary generation

export async function POST(request: NextRequest) {
  try {
    const { transcript } = await request.json();

    if (!transcript || typeof transcript !== 'string') {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: 'Transcript is required' },
        { status: 400 }
      );
    }

    if (transcript.trim().length === 0) {
      return NextResponse.json(
        { error: 'EMPTY_TRANSCRIPT', message: 'Transcript cannot be empty' },
        { status: 400 }
      );
    }

    // Increment trial count (this is their usage)
    const clientIp = getClientIp(request.headers);
    await incrementDemoTrialCount(clientIp);

    // Generate summary
    const summary = await generateDemoSummary(transcript);

    return NextResponse.json({
      success: true,
      summary,
    });
  } catch (error) {
    console.error('Demo summary generation error:', error);
    return NextResponse.json(
      {
        error: 'GENERATION_FAILED',
        message: 'Failed to generate summary. Please try again.',
      },
      { status: 500 }
    );
  }
}
