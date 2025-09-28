import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json(
        { error: "Authorization code not provided" },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("Auth callback error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    if (data.session) {
      // Session created successfully
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Auth callback API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}