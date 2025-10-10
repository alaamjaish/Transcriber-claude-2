"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateEmbedding, prepareCombinedContent } from "@/lib/ai/embeddings";

interface SaveSessionInput {
  transcript: string;
  durationMs: number;
  studentId: string;
  startedAt: number;
}

interface SaveSessionResult {
  id: string;
  timestamp: string;
  transcript: string;
  durationMs: number;
}

export async function saveSessionAction({ transcript, durationMs, studentId, startedAt }: SaveSessionInput): Promise<SaveSessionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Unauthorized");
  }

  if (!studentId) {
    throw new Error("Student id is required to save a session");
  }

  const startedDate = new Date(startedAt);
  if (Number.isNaN(startedDate.getTime())) {
    throw new Error("Invalid session start timestamp");
  }

  const trimmedTranscript = transcript.trim();
  const startedIso = startedDate.toISOString();
  const duration = Math.max(0, Math.round(durationMs));

  const { data: existing, error: existingError } = await supabase
    .from("sessions")
    .select("id, timestamp, transcript, duration_ms")
    .eq("owner_user_id", user.id)
    .eq("student_id", studentId)
    .eq("timestamp", startedIso)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  let record:
    | {
        id: string;
        timestamp: string;
        transcript: string | null;
        duration_ms: number | null;
      }
    | null = existing;

  if (record) {
    const needsUpdate = (record.transcript ?? "") !== trimmedTranscript || (record.duration_ms ?? 0) !== duration;

    if (needsUpdate) {
      const { data, error } = await supabase
        .from("sessions")
        .update({ transcript: trimmedTranscript, duration_ms: duration })
        .eq("id", record.id)
        .select("id, timestamp, transcript, duration_ms")
        .single();

      if (error || !data) {
        throw new Error(error?.message ?? "Failed to update session");
      }

      record = data;
    }
  } else {
    const { data, error } = await supabase
      .from("sessions")
      .insert([
        {
          owner_user_id: user.id,
          student_id: studentId,
          transcript: trimmedTranscript,
          duration_ms: duration,
          timestamp: startedIso,
        },
      ])
      .select("id, timestamp, transcript, duration_ms")
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Failed to create session");
    }

    record = data;
  }

  if (!record) {
    throw new Error("Session could not be saved");
  }

  revalidatePath("/recordings");
  revalidatePath("/students");
  revalidatePath(`/students/${studentId}`);

  return {
    id: record.id,
    timestamp: record.timestamp,
    transcript: record.transcript ?? "",
    durationMs: record.duration_ms ?? duration,
  };
}

export async function deleteSessionAction(sessionId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Unauthorized");
  }

  if (!sessionId) {
    throw new Error("Session ID is required");
  }

  const { error } = await supabase
    .from("sessions")
    .delete()
    .eq("id", sessionId)
    .eq("owner_user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/recordings");
  revalidatePath("/students");
}

interface UpdateSessionContentInput {
  sessionId: string;
  summaryMd?: string;
  homeworkMd?: string;
}

export async function updateSessionContentAction({
  sessionId,
  summaryMd,
  homeworkMd,
}: UpdateSessionContentInput): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Unauthorized");
  }

  if (!sessionId) {
    throw new Error("Session ID is required");
  }

  // Get current session to know student_id for revalidation
  const { data: session, error: fetchError } = await supabase
    .from("sessions")
    .select("student_id, summary_md, homework_md")
    .eq("id", sessionId)
    .eq("owner_user_id", user.id)
    .single();

  if (fetchError || !session) {
    throw new Error("Session not found");
  }

  // Prepare updates
  const updates: {
    summary_md?: string;
    homework_md?: string;
    summary_embedding?: number[] | null;
    homework_embedding?: number[] | null;
    combined_content?: string;
    embeddings_generated_at?: string;
    embedding_model?: string;
  } = {};

  if (summaryMd !== undefined) {
    updates.summary_md = summaryMd;
  }

  if (homeworkMd !== undefined) {
    updates.homework_md = homeworkMd;
  }

  // Update the session
  const { error: updateError } = await supabase
    .from("sessions")
    .update(updates)
    .eq("id", sessionId)
    .eq("owner_user_id", user.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  // Regenerate embeddings for the updated content
  try {
    const finalSummary = summaryMd !== undefined ? summaryMd : session.summary_md || "";
    const finalHomework = homeworkMd !== undefined ? homeworkMd : session.homework_md || "";

    const summaryEmbedding = finalSummary.trim() ? await generateEmbedding(finalSummary) : null;
    const homeworkEmbedding = finalHomework.trim() ? await generateEmbedding(finalHomework) : null;
    const combinedContent = prepareCombinedContent(finalSummary, finalHomework);

    await supabase
      .from("sessions")
      .update({
        summary_embedding: summaryEmbedding,
        homework_embedding: homeworkEmbedding,
        combined_content: combinedContent,
        embeddings_generated_at: new Date().toISOString(),
        embedding_model: "text-embedding-3-small",
      })
      .eq("id", sessionId)
      .eq("owner_user_id", user.id);
  } catch (embeddingError) {
    console.error("Failed to regenerate embeddings (non-fatal):", embeddingError);
    // Don't fail the whole operation if embeddings fail
  }

  revalidatePath("/recordings");
  revalidatePath("/students");
  if (session.student_id) {
    revalidatePath(`/students/${session.student_id}`);
  }
}
