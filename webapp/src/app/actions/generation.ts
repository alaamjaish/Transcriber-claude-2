"use server";

import { revalidatePath } from "next/cache";

import { generateHomework, generateSummary } from "@/lib/ai/generate";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface GenerationResult {
  summaryGenerated: boolean;
  homeworkGenerated: boolean;
  error?: string;
}

export async function generateSessionArtifactsAction(
  sessionId: string,
  options?: { summary?: boolean; homework?: boolean },
  userContext?: string,
): Promise<GenerationResult> {
  if (!sessionId) {
    throw new Error("Session ID is required");
  }

  const runSummary = options?.summary ?? true;
  const runHomework = options?.homework ?? true;

  if (!runSummary && !runHomework) {
    return { summaryGenerated: false, homeworkGenerated: false };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Unauthorized");
  }

  const {
    data: session,
    error: sessionError,
  } = await supabase
    .from("sessions")
    .select("id, transcript, student_id")
    .eq("id", sessionId)
    .eq("owner_user_id", user.id)
    .maybeSingle();

  if (sessionError) {
    throw new Error(sessionError.message);
  }

  if (!session) {
    throw new Error("Session not found");
  }

  const transcript = session.transcript ?? "";

  if (!transcript.trim()) {
    const emptyUpdates: {
      summary_md?: string | null;
      homework_md?: string | null;
      generation_status?: string | null;
      generation_started_at?: string | null;
    } = {};
    if (runSummary) emptyUpdates.summary_md = null;
    if (runHomework) emptyUpdates.homework_md = null;
    emptyUpdates.generation_status = "idle";
    emptyUpdates.generation_started_at = null;

    if (Object.keys(emptyUpdates).length > 0) {
      await supabase
        .from("sessions")
        .update(emptyUpdates)
        .eq("id", sessionId)
        .eq("owner_user_id", user.id);

      revalidatePath("/recordings");
      revalidatePath("/students");
      if (session.student_id) {
        revalidatePath(`/students/${session.student_id}`);
      }
    }

    return { summaryGenerated: false, homeworkGenerated: false };
  }

  // Mark generation as started
  await supabase
    .from("sessions")
    .update({
      generation_status: "generating",
      generation_started_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
    .eq("owner_user_id", user.id);

  // Force immediate UI update to show "generating" status
  revalidatePath("/recordings");
  revalidatePath("/students");
  if (session.student_id) {
    revalidatePath(`/students/${session.student_id}`);
  }

  const updates: {
    summary_md?: string | null;
    homework_md?: string | null;
    generation_status?: string;
    generation_started_at?: string | null;
  } = {};
  let errorMessage: string | undefined;
  let summaryGenerated = false;
  let homeworkGenerated = false;

  if (runSummary) {
    try {
      const summaryMd = await generateSummary(transcript, userContext);
      updates.summary_md = summaryMd;
      summaryGenerated = true;
    } catch (error) {
      updates.summary_md = null;
      const message = error instanceof Error ? error.message : String(error);
      errorMessage = errorMessage ? `${errorMessage}; ${message}` : message;
    }
  }

  if (runHomework) {
    try {
      const homeworkMd = await generateHomework(transcript, userContext);
      updates.homework_md = homeworkMd;
      homeworkGenerated = true;
    } catch (error) {
      updates.homework_md = null;
      const message = error instanceof Error ? error.message : String(error);
      errorMessage = errorMessage ? `${errorMessage}; ${message}` : message;
    }
  }

  // Set final status based on results
  if (errorMessage) {
    updates.generation_status = "error";
  } else if (summaryGenerated || homeworkGenerated) {
    updates.generation_status = "complete";
  } else {
    updates.generation_status = "idle";
  }
  updates.generation_started_at = null; // Clear started timestamp

  if (Object.keys(updates).length > 0) {
    await supabase
      .from("sessions")
      .update(updates)
      .eq("id", sessionId)
      .eq("owner_user_id", user.id);

    revalidatePath("/recordings");
    revalidatePath("/students");
    if (session.student_id) {
      revalidatePath(`/students/${session.student_id}`);
    }
  }

  return { summaryGenerated, homeworkGenerated, error: errorMessage };
}
