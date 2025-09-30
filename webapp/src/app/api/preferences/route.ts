import { NextResponse } from "next/server";
import { loadUserPreferences } from "@/lib/data-loaders";

export async function GET() {
  try {
    const preferences = await loadUserPreferences();

    if (!preferences) {
      return NextResponse.json({
        currentStudentId: null,
      });
    }

    return NextResponse.json({
      currentStudentId: preferences.currentStudentId || null,
    });
  } catch (error) {
    console.error("Failed to load preferences", error);
    return NextResponse.json(
      { error: "Failed to load preferences" },
      { status: 500 }
    );
  }
}