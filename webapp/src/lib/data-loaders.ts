import { cache } from "react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Session, Student } from "@/lib/types";
import type { Database } from "@/lib/database.types";

const PAGE_SIZE = 10;

type SessionRow = Database["public"]["Tables"]["sessions"]["Row"] & {
  students?: { name: string }[];
  student?: { name: string } | null;
  student_name?: string | null;
};

type StudentRow = Database["public"]["Tables"]["students"]["Row"] & {
  total_sessions?: number | null;
};

async function requireSupabaseContext() {
  const client = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();

  if (error) {
    throw error;
  }

  if (!user) {
    throw new Error("No authenticated user");
  }

  return { client, userId: user.id };
}

function buildSession(row: SessionRow): Session {
  const transcript = row.transcript ?? "";
  const summaryReady = Boolean(row.summary_md);
  const homeworkReady = Boolean(row.homework_md);

  let generationStatus: Session["generationStatus"] = "idle";
  if (!transcript.trim()) {
    generationStatus = "empty";
  } else if (summaryReady && homeworkReady) {
    generationStatus = "complete";
  } else if (!summaryReady || !homeworkReady) {
    generationStatus = "generating";
  }

  const fromRelation = row.student ?? row.students?.[0] ?? null;

  return {
    id: row.id,
    studentId: row.student_id ?? undefined,
    studentName: fromRelation?.name ?? row.student_name ?? undefined,
    recordedAt: row.timestamp ?? row.created_at,
    durationMs: row.duration_ms ?? 0,
    transcriptPreview: transcript.slice(0, 180),
    generationStatus,
    summaryReady,
    homeworkReady,
  };
}

function buildStudent(row: StudentRow): Student {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    totalSessions: typeof row.total_sessions === "number" ? row.total_sessions : undefined,
  };
}

export const loadStudents = cache(async (): Promise<Student[]> => {
  const { client, userId } = await requireSupabaseContext();

  const { data, error } = await client
    .from("students")
    .select("id, name, created_at")
    .eq("owner_user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data as StudentRow[] | null)?.map(buildStudent) ?? [];
});

export const loadStudentById = cache(async (studentId: string): Promise<Student | null> => {
  if (!studentId) {
    throw new Error("studentId is required");
  }

  const { client, userId } = await requireSupabaseContext();

  const { data, error } = await client
    .from("students")
    .select("id, name, created_at")
    .eq("owner_user_id", userId)
    .eq("id", studentId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? buildStudent(data as StudentRow) : null;
});

export const loadRecentSessions = cache(async (): Promise<Session[]> => {
  const { client, userId } = await requireSupabaseContext();

  const { data, error } = await client
    .from("sessions")
    .select("id, student_id, timestamp, duration_ms, transcript, summary_md, homework_md, created_at, students(name)")
    .eq("owner_user_id", userId)
    .order("timestamp", { ascending: false })
    .limit(PAGE_SIZE);

  if (error) {
    throw error;
  }

  return (data as SessionRow[] | null)?.map(buildSession) ?? [];
});

export const loadSessionsForStudent = cache(async (studentId: string): Promise<Session[]> => {
  if (!studentId) {
    throw new Error("studentId is required");
  }

  const { client, userId } = await requireSupabaseContext();

  const { data, error } = await client
    .from("sessions")
    .select("id, student_id, timestamp, duration_ms, transcript, summary_md, homework_md, created_at")
    .eq("owner_user_id", userId)
    .eq("student_id", studentId)
    .order("timestamp", { ascending: false })
    .limit(PAGE_SIZE);

  if (error) {
    throw error;
  }

  return (data as SessionRow[] | null)?.map(buildSession) ?? [];
});
