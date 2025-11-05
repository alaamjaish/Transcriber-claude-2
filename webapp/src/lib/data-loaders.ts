import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Session, Student, Prompt, DashboardStudent, TeacherPreference } from "@/lib/types";
import type { Database } from "@/lib/database.types";

const PAGE_SIZE = 10;

type RecentSessionQueryResult = {
  id: string;
  student_id: string;
  timestamp: string;
  duration_ms: number;
  transcript: string;
  summary_md: string | null;
  homework_md: string | null;
  generation_status: string | null;
  generation_started_at: string | null;
  created_at: string;
  students: { name: string };
};

type StudentSessionQueryResult = {
  id: string;
  student_id: string;
  timestamp: string;
  duration_ms: number;
  transcript: string;
  summary_md: string | null;
  homework_md: string | null;
  generation_status: string | null;
  generation_started_at: string | null;
  created_at: string;
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

function limitWords(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(' ') + '...';
}

function buildSession(row: RecentSessionQueryResult | StudentSessionQueryResult): Session {
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

  // Handle student name differently for different query types
  const studentName = 'students' in row ? row.students?.name : undefined;

  return {
    id: row.id,
    studentId: row.student_id ?? undefined,
    studentName: studentName ?? undefined,
    recordedAt: row.timestamp ?? row.created_at,
    durationMs: row.duration_ms ?? 0,
    transcript,
    transcriptPreview: limitWords(transcript, 8),
    generationStatus,
    summaryReady,
    homeworkReady,
    summaryMd: row.summary_md ?? null,
    homeworkMd: row.homework_md ?? null,
    aiGenerationStatus: row.generation_status ?? null,
    aiGenerationStartedAt: row.generation_started_at ?? null,
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

export async function loadStudents(): Promise<Student[]> {
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
}

export async function loadStudentById(studentId: string): Promise<Student | null> {
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
}

export async function loadRecentSessions(): Promise<Session[]> {
  const { client, userId } = await requireSupabaseContext();

  const { data, error } = await client
    .from("sessions")
    .select("id, student_id, timestamp, duration_ms, transcript, summary_md, homework_md, generation_status, generation_started_at, created_at, students(name)")
    .eq("owner_user_id", userId)
    .order("timestamp", { ascending: false })
    .limit(PAGE_SIZE);

  if (error) {
    throw error;
  }

  return (data as RecentSessionQueryResult[] | null)?.map(buildSession) ?? [];
}

export async function loadSessionsForStudent(studentId: string): Promise<Session[]> {
  if (!studentId) {
    throw new Error("studentId is required");
  }

  const { client, userId } = await requireSupabaseContext();

  const { data, error } = await client
    .from("sessions")
    .select("id, student_id, timestamp, duration_ms, transcript, summary_md, homework_md, generation_status, generation_started_at, created_at")
    .eq("owner_user_id", userId)
    .eq("student_id", studentId)
    .order("timestamp", { ascending: false });

  if (error) {
    throw error;
  }

  return (data as StudentSessionQueryResult[] | null)?.map(buildSession) ?? [];
}

export async function loadPrompts(): Promise<Prompt[]> {
  const { client, userId } = await requireSupabaseContext();

  const { data, error } = await client
    .from("prompts")
    .select("id, name, prompt_text, created_at, updated_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    userId,
    name: row.name,
    promptText: row.prompt_text,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function loadUserPreferences(): Promise<TeacherPreference | null> {
  const { client, userId } = await requireSupabaseContext();

  const { data, error } = await client
    .from("teacher_preferences")
    .select("user_id, current_student_id, default_summary_prompt_id, default_homework_prompt_id, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load user preferences", error);
    return null;
  }

  if (!data) {
    return null;
  }

  return {
    userId: data.user_id,
    currentStudentId: data.current_student_id ?? undefined,
    defaultSummaryPromptId: data.default_summary_prompt_id ?? undefined,
    defaultHomeworkPromptId: data.default_homework_prompt_id ?? undefined,
    updatedAt: data.updated_at,
  };
}

export async function loadStudentsWithSessionCounts(): Promise<DashboardStudent[]> {
  const { client, userId } = await requireSupabaseContext();

  // First get all students
  const { data: studentsData, error: studentsError } = await client
    .from("students")
    .select("id, name, created_at")
    .eq("owner_user_id", userId)
    .order("name", { ascending: true });

  if (studentsError) {
    throw studentsError;
  }

  const students = studentsData || [];

  // If no students, return empty array
  if (students.length === 0) {
    return [];
  }

  // Get session counts and last session dates for all students
  const studentIds = students.map(s => s.id);

  const { data: sessionData, error: sessionError } = await client
    .from("sessions")
    .select("student_id, timestamp")
    .eq("owner_user_id", userId)
    .in("student_id", studentIds)
    .order("timestamp", { ascending: false });

  if (sessionError) {
    throw sessionError;
  }

  // Process session data to get counts and last dates
  const sessionStats: Record<string, { count: number; lastDate?: string }> = {};

  for (const session of sessionData || []) {
    const studentId = session.student_id;
    if (!sessionStats[studentId]) {
      sessionStats[studentId] = { count: 0 };
    }
    sessionStats[studentId].count++;

    // Set last session date (first one due to desc order)
    if (!sessionStats[studentId].lastDate) {
      sessionStats[studentId].lastDate = session.timestamp;
    }
  }

  // Build dashboard students with session data
  return students.map((student): DashboardStudent => ({
    id: student.id,
    name: student.name,
    createdAt: student.created_at,
    totalSessions: sessionStats[student.id]?.count || 0,
    lastSessionDate: sessionStats[student.id]?.lastDate,
  }));
}

