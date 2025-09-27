import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { signOutAction } from "@/app/auth/actions";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  let supabase: SupabaseClient<Database> | null = null;
  try {
    supabase = await createSupabaseServerClient();
  } catch (error) {
    console.warn("DashboardLayout", error);
  }

  if (!supabase) {
    redirect("/auth/sign-in");
  }

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    console.warn("Failed to fetch session", error);
    redirect("/auth/sign-in");
  }

  if (!session) {
    redirect("/auth/sign-in");
  }

  const userEmail = session.user.email ?? undefined;
  const userId = session.user.id;

  let currentStudentId: string | null = null;
  let currentStudentName: string | null = null;

  const {
    data: preference,
    error: preferenceError,
  } = await supabase
    .from("teacher_preferences")
    .select("current_student_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (preferenceError) {
    console.warn("Failed to load teacher preferences", preferenceError);
  }

  currentStudentId = preference?.current_student_id ?? null;

  if (currentStudentId) {
    const {
      data: student,
      error: studentError,
    } = await supabase
      .from("students")
      .select("id, name")
      .eq("owner_user_id", userId)
      .eq("id", currentStudentId)
      .maybeSingle();

    if (studentError) {
      console.warn("Failed to load selected student", studentError);
    }

    if (student) {
      currentStudentName = student.name ?? null;
    } else {
      currentStudentId = null;
    }
  }

  return (
    <AppShell
      title="Recording Workspace"
      subtitle="Monitor live transcription, manage students, and publish lesson artefacts."
      userEmail={userEmail}
      onSignOut={signOutAction}
      initialStudentId={currentStudentId}
      initialStudentName={currentStudentName}
    >
      {children}
    </AppShell>
  );
}
