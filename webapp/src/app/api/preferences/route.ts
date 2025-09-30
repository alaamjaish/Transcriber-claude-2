import { NextResponse } from "next/server";
import { loadUserPreferences } from "@/lib/data-loaders";

export async function GET() {
  try {
    const preferences = await loadUserPreferences();

    if (!preferences) {
      return NextResponse.json({
        defaultSummaryPromptId: null,
        defaultHomeworkPromptId: null,
      });
    }

    return NextResponse.json({
      defaultSummaryPromptId: preferences.defaultSummaryPromptId || null,
      defaultHomeworkPromptId: preferences.defaultHomeworkPromptId || null,
    });
  } catch (error) {
    console.error("Failed to load preferences", error);
    return NextResponse.json(
      { error: "Failed to load preferences" },
      { status: 500 }
    );
  }
}