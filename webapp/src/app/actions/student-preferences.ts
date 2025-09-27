"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";

interface PreferenceResult {
  currentStudentId: string | null;
  studentName: string | null;
}

export async function setCurrentStudentAction(studentId: string | null): Promise<PreferenceResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Unauthorized");
  }

  let studentName: string | null = null;

  if (studentId) {
    const {
      data: student,
      error: studentError,
    } = await supabase
      .from("students")
      .select("id, name")
      .eq("id", studentId)
      .eq("owner_user_id", user.id)
      .maybeSingle();

    if (studentError) {
      throw new Error(studentError.message);
    }

    if (!student) {
      throw new Error("Student not found");
    }

    studentName = student.name ?? null;
  }

  const payload = {
    user_id: user.id,
    current_student_id: studentId,
    updated_at: new Date().toISOString(),
  };

  const { error: upsertError } = await supabase
    .from("teacher_preferences")
    .upsert(payload, { onConflict: "user_id" });

  if (upsertError) {
    throw new Error(upsertError.message);
  }

  revalidatePath("/recordings");
  revalidatePath("/students");
  if (studentId) {
    revalidatePath(`/students/${studentId}`);
  }

  return { currentStudentId: studentId, studentName };
}
