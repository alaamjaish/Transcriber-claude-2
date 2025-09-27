"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";

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

  const trimmedTranscript = transcript.trim();
  const startedIso = new Date(startedAt).toISOString();
  const duration = Math.max(0, Math.round(durationMs));
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

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/recordings");
  revalidatePath("/students");
  revalidatePath(`/students/${studentId}`);

  return {
    id: data.id,
    timestamp: data.timestamp,
    transcript: data.transcript ?? "",
    durationMs: data.duration_ms ?? durationMs,
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
