import { NextResponse } from "next/server";
import { issueSonioxToken } from "@/lib/soniox";

export const runtime = 'nodejs';

/**
 * Public endpoint for demo users to get Soniox tokens
 * No authentication required
 */
export async function POST() {
  try {
    const token = await issueSonioxToken();
    return NextResponse.json(token);
  } catch (error) {
    console.error("/api/demo/soniox-token error", error);
    return NextResponse.json(
      { error: "Failed to issue Soniox token" },
      { status: 500 }
    );
  }
}

// Also support GET for easier testing
export async function GET() {
  return POST();
}
