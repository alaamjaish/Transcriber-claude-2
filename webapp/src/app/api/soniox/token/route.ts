import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { issueSonioxToken } from "@/lib/soniox";

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = await issueSonioxToken();
    return NextResponse.json(token);
  } catch (error) {
    console.error("/api/soniox/token error", error);
    return NextResponse.json({ error: "Failed to issue token" }, { status: 500 });
  }
}