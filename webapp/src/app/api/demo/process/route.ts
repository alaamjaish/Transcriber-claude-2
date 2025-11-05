import { NextRequest, NextResponse } from 'next/server';
import { checkDemoRateLimit, incrementDemoTrialCount, getClientIp } from '@/lib/demo-rate-limit';
import { transcribeAudioDemo } from '@/lib/demo-transcribe';
import { generateDemoSummary } from '@/lib/ai/demo-generate';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes max execution time

export async function POST(request: NextRequest) {
  try {
    // Get client IP address
    const clientIp = getClientIp(request.headers);

    // Check rate limit
    const rateLimitResult = await checkDemoRateLimit(clientIp);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'RATE_LIMIT_EXCEEDED',
          message: "You've used your 3 free trials for today!",
          remaining: 0,
          resetDate: rateLimitResult.resetDate,
        },
        { status: 429 }
      );
    }

    // Get the audio file from the request
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'NO_AUDIO', message: 'No audio file provided' },
        { status: 400 }
      );
    }

    // Check file size (max 25MB for Whisper API)
    const maxSize = 25 * 1024 * 1024; // 25MB
    if (audioFile.size > maxSize) {
      return NextResponse.json(
        { error: 'FILE_TOO_LARGE', message: 'Audio file is too large (max 25MB)' },
        { status: 400 }
      );
    }

    // Increment trial count before processing (to prevent abuse)
    await incrementDemoTrialCount(clientIp);

    // Convert File to Blob
    const audioBlob = new Blob([await audioFile.arrayBuffer()], {
      type: audioFile.type,
    });

    // Step 1: Transcribe audio
    let transcript: string;
    try {
      transcript = await transcribeAudioDemo(audioBlob);
    } catch (error) {
      console.error('Transcription error:', error);
      return NextResponse.json(
        {
          error: 'TRANSCRIPTION_FAILED',
          message: 'Failed to transcribe audio. Please try again.',
        },
        { status: 500 }
      );
    }

    if (!transcript || transcript.trim().length === 0) {
      return NextResponse.json(
        {
          error: 'EMPTY_TRANSCRIPT',
          message: 'No speech detected in the recording. Please try again.',
        },
        { status: 400 }
      );
    }

    // Step 2: Generate summary
    let summary: string;
    try {
      summary = await generateDemoSummary(transcript);
    } catch (error) {
      console.error('Summary generation error:', error);
      return NextResponse.json(
        {
          error: 'SUMMARY_FAILED',
          message: 'Failed to generate summary. Please try again.',
        },
        { status: 500 }
      );
    }

    // Return results
    return NextResponse.json({
      success: true,
      transcript,
      summary,
      remaining: rateLimitResult.remaining - 1,
      resetDate: rateLimitResult.resetDate,
    });
  } catch (error) {
    console.error('Demo processing error:', error);
    return NextResponse.json(
      {
        error: 'SERVER_ERROR',
        message: 'An unexpected error occurred. Please try again.',
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
